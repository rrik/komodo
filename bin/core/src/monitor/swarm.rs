use std::{
  sync::{Arc, OnceLock},
  time::Duration,
};

use anyhow::anyhow;
use async_timing_util::wait_until_timelength;
use cache::CloneCache;
use database::mungos::find::find_collect;
use futures_util::future::join_all;
use komodo_client::entities::{
  docker::node::NodeState,
  komodo_timestamp,
  server::Server,
  swarm::{Swarm, SwarmState},
};
use periphery_client::api::swarm::{
  PollSwarmStatus, PollSwarmStatusResponse,
};
use tokio::sync::Mutex;

use crate::{
  helpers::periphery_client,
  resource,
  state::{CachedSwarmStatus, db_client, swarm_status_cache},
};

const ADDITIONAL_MS: u128 = 1000;

pub fn spawn_swarm_monitoring_loop(
  interval: async_timing_util::Timelength,
) {
  tokio::spawn(async move {
    refresh_swarm_cache(komodo_timestamp()).await;
    loop {
      let ts = (wait_until_timelength(interval, ADDITIONAL_MS).await
        - ADDITIONAL_MS) as i64;
      refresh_swarm_cache(ts).await;
    }
  });
}

async fn refresh_swarm_cache(_ts: i64) {
  let swarms =
    match find_collect(&db_client().swarms, None, None).await {
      Ok(swarms) => swarms,
      Err(e) => {
        error!(
          "Failed to get swarm list (refresh swarm cache) | {e:#}"
        );
        return;
      }
    };
  let futures = swarms.into_iter().map(|swarm| async move {
    update_cache_for_swarm(&swarm, false).await;
  });
  join_all(futures).await;
  // tokio::join!(check_alerts(ts), record_swarm_stats(ts));
}

/// Makes sure cache for swarm doesn't update too frequently / simultaneously.
/// If forced, will still block against simultaneous update.
fn update_cache_for_swarm_controller()
-> &'static CloneCache<String, Arc<Mutex<i64>>> {
  static CACHE: OnceLock<CloneCache<String, Arc<Mutex<i64>>>> =
    OnceLock::new();
  CACHE.get_or_init(Default::default)
}

/// The background loop will call this with force: false,
/// which exits early if the lock is busy or it was completed too recently.
/// If force is true, it will wait on simultaneous calls, and will
/// ignore the restriction on being completed too recently.
pub async fn update_cache_for_swarm(swarm: &Swarm, force: bool) {
  // Concurrency controller to ensure it isn't done too often
  // when it happens in other contexts.
  let controller = update_cache_for_swarm_controller()
    .get_or_insert_default(&swarm.id)
    .await;
  let mut lock = match controller.try_lock() {
    Ok(lock) => lock,
    Err(_) if force => controller.lock().await,
    Err(_) => return,
  };

  let now = komodo_timestamp();

  // early return if called again sooner than 1s.
  if !force && *lock > now - 1_000 {
    return;
  }

  *lock = now;

  if swarm.config.server_ids.is_empty() {
    swarm_status_cache()
      .insert(
        swarm.id.clone(),
        CachedSwarmStatus {
          state: SwarmState::Unknown,
          inspect: None,
          lists: None,
          err: Some(
            anyhow!("No Servers configured as manager nodes").into(),
          ),
        }
        .into(),
      )
      .await;
    return;
  }

  let PollSwarmStatusResponse { inspect, lists } =
    match poll_swarm_inspect_info(&swarm.config.server_ids).await {
      Ok(info) => info,
      Err(e) => {
        swarm_status_cache()
          .insert(
            swarm.id.clone(),
            CachedSwarmStatus {
              state: SwarmState::Unknown,
              inspect: None,
              lists: None,
              err: Some(e.into()),
            }
            .into(),
          )
          .await;
        return;
      }
    };

  let mut state = SwarmState::Healthy;

  for node in &lists.nodes {
    let node_state = node
      .status
      .as_ref()
      .and_then(|status| status.state)
      .unwrap_or_default();
    if !matches!(node_state, NodeState::READY) {
      state = SwarmState::Unhealthy;
    }
  }

  swarm_status_cache()
    .insert(
      swarm.id.clone(),
      CachedSwarmStatus {
        state,
        inspect,
        lists: Some(lists),
        err: None,
      }
      .into(),
    )
    .await;
}

async fn poll_swarm_inspect_info(
  servers: &[String],
) -> anyhow::Result<PollSwarmStatusResponse> {
  let mut err = Option::<anyhow::Error>::None;
  for server in servers {
    match poll_swarm_inspect_info_from_server(server).await {
      Ok(res) => return Ok(res),
      Err(e) => err = Some(e),
    }
  }
  Err(err.unwrap_or_else(|| {
    anyhow!("Failed to poll swarm inspect info with unknown error")
  }))
}

async fn poll_swarm_inspect_info_from_server(
  server: &str,
) -> anyhow::Result<PollSwarmStatusResponse> {
  let server = resource::get::<Server>(server).await?;
  let periphery = periphery_client(&server).await?;
  periphery
    .request_custom_timeout(
      PollSwarmStatus {},
      Duration::from_secs(1),
    )
    .await
}
