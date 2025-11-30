use std::{
  net::IpAddr,
  sync::Arc,
  time::{Duration, Instant},
};

use anyhow::anyhow;
use axum::http::{HeaderMap, StatusCode};
use cache::CloneCache;
use serror::{AddStatusCode, AddStatusCodeError};
use tokio::sync::RwLock;

/// Trait to extend fallible futures with stateful
/// rate limiting.
pub trait WithFailureRateLimit<R, E>
where
  Self: Future<Output = Result<R, E>> + Sized,
  E: Into<serror::Error> + Send,
{
  /// Ensure the given IP 'ip' is
  /// not violating the givin 'limiter' rate limit rules
  /// before executing this fallible future.
  ///
  /// If the rules are violated, will return `429 Too Many Requests`.
  ///
  /// If the rate limiting rules are not violated, the
  /// future will be executed, and if it fails then the
  /// attempt time will be recorded for rate limit,
  /// and original error returned.
  ///
  /// The end result rate limits failing requests,
  /// while succeeding requests are not rate late limited.
  fn with_failure_rate_limit_using_ip(
    self,
    limiter: &RateLimiter,
    ip: &IpAddr,
  ) -> impl Future<Output = serror::Result<R>> {
    async {
      if limiter.disabled {
        return self.await.map_err(Into::into);
      }

      // Only locks if entry at key does not exist yet.
      let attempts = limiter.attempts.get_or_insert_default(ip).await;

      // RwLock allows multiple readers, minimizing locking effect.
      let read = attempts.read().await;

      let now = Instant::now();
      let window_start = now - limiter.window;

      let count =
        read.iter().filter(|&&time| time > window_start).count();
      // Drop the read lock immediately
      drop(read);

      // Don't allow future to be executed if rate limiter violated
      if count >= limiter.max_attempts {
        // Use this opportunity to take write lock and clear the attempts cache
        attempts.write().await.retain(|&time| time > window_start);
        return Err(
          anyhow!(
            "Too many attempts. Try again in {:?}",
            limiter.window
          )
          .status_code(StatusCode::TOO_MANY_REQUESTS),
        );
      }

      match self.await {
        // The succeeding branch has no write locks
        // after the initial attempt array initializes.
        Ok(res) => Ok(res),
        Err(e) => {
          // Failing branch takes exclusive write lock.
          let mut write = attempts.write().await;
          // Use this opportunity to clear the attempts cache
          write.retain(|&time| time > window_start);
          // Always push after failed attempts, eg failed api key check.
          write.push(now);
          // Return original error converted to serror::Error
          Err(e.into())
        }
      }
    }
  }

  fn with_failure_rate_limit_using_headers(
    self,
    limiter: &RateLimiter,
    headers: &HeaderMap,
  ) -> impl Future<Output = serror::Result<R>> {
    async {
      // Can skip header ip extraction if disabled
      if limiter.disabled {
        return self.await.map_err(Into::into);
      }
      let ip = get_ip_from_headers(headers)?;
      self.with_failure_rate_limit_using_ip(limiter, &ip).await
    }
  }
}

impl<F, R, E> WithFailureRateLimit<R, E> for F
where
  F: Future<Output = Result<R, E>> + Sized,
  E: Into<serror::Error> + Send,
{
}

type RateLimiterMapEntry = Arc<RwLock<Vec<Instant>>>;

pub struct RateLimiter {
  attempts: CloneCache<IpAddr, RateLimiterMapEntry>,
  disabled: bool,
  max_attempts: usize,
  window: Duration,
}

impl RateLimiter {
  /// Create a new rate limiter. Also spawns tokio task
  /// to cleanup stale keys (ones which haven't been accessed in 15+ minutes).
  ///
  /// # Arguments
  ///
  /// * `disabled` - Whether rate limiter is disabled
  /// * `max_attempts` - Maximum number of attempts allowed in given window
  /// * `window_seconds` - Time window in seconds
  pub fn new(
    disabled: bool,
    max_attempts: usize,
    window_seconds: u64,
  ) -> Arc<Self> {
    let limiter = Arc::new(Self {
      attempts: CloneCache::default(),
      disabled,
      max_attempts,
      window: Duration::from_secs(window_seconds),
    });
    if !disabled {
      spawn_cleanup_task(limiter.clone());
    }
    limiter
  }
}

/// Task to run every 15 mins and clear off
/// the best guess of stale entries. Note that
/// repeatedly succeeding calls from IP will end up with
/// "empty" attempts array, and will be cleared off when this runs.
/// The impact on performance should be negligible until very large scale.
fn spawn_cleanup_task(limiter: Arc<RateLimiter>) {
  tokio::spawn(async move {
    let mut interval = tokio::time::interval(Duration::from_secs(60));
    loop {
      interval.tick().await;
      let remove_before =
        Instant::now() - Duration::from_secs(15 * 60);
      limiter
        .attempts
        .retain(|_, attempts| {
          let Ok(attempts) = attempts.try_read() else {
            // Retain any locked attempts, they are being actively used and not stale.
            return true;
          };
          let Some(&last) = attempts.last() else {
            // Remove any empty attempts arrays
            return false;
          };
          last > remove_before
        })
        .await;
    }
  });
}

pub fn get_ip_from_headers(
  headers: &HeaderMap,
) -> serror::Result<IpAddr> {
  // Check X-Forwarded-For header (first IP in chain)
  if let Some(forwarded) = headers.get("x-forwarded-for")
    && let Ok(forwarded_str) = forwarded.to_str()
    && let Some(ip) = forwarded_str.split(',').next()
  {
    return ip.trim().parse().status_code(StatusCode::UNAUTHORIZED);
  }

  // Check X-Real-IP header
  if let Some(real_ip) = headers.get("x-real-ip")
    && let Ok(ip) = real_ip.to_str()
  {
    return ip.trim().parse().status_code(StatusCode::UNAUTHORIZED);
  }

  Err(
    anyhow!("'x-forwarded-for' and 'x-real-ip' are both missing")
      .status_code(StatusCode::UNAUTHORIZED),
  )
}
