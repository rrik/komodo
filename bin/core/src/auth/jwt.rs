use std::collections::HashMap;

use anyhow::{Context, anyhow};
use async_timing_util::{
  Timelength, get_timelength_in_ms, unix_timestamp_ms,
};
use database::mungos::mongodb::bson::doc;
use jsonwebtoken::{
  DecodingKey, EncodingKey, Header, Validation, decode, encode,
};
use komodo_client::{
  api::auth::JwtResponse,
  entities::{config::core::CoreConfig, random_string},
};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use serror::{AddStatusCode as _, AddStatusCodeError as _};
use tokio::sync::Mutex;

use crate::auth::EXCHANGE_TOKEN_CLOCK_SKEW_TOLERANCE_MS;

type ExchangeTokenMap = Mutex<HashMap<String, (JwtResponse, u128)>>;

#[derive(Serialize, Deserialize, Clone)]
pub struct JwtClaims {
  pub id: String,
  pub iat: u128,
  pub exp: u128,
}

pub struct JwtClient {
  header: Header,
  validation: Validation,
  encoding_key: EncodingKey,
  decoding_key: DecodingKey,
  ttl_ms: u128,
  exchange_tokens: ExchangeTokenMap,
}

impl JwtClient {
  pub fn new(config: &CoreConfig) -> anyhow::Result<JwtClient> {
    let secret = if config.jwt_secret.is_empty() {
      random_string(40)
    } else {
      config.jwt_secret.clone()
    };
    Ok(JwtClient {
      header: Header::default(),
      validation: Validation::new(Default::default()),
      encoding_key: EncodingKey::from_secret(secret.as_bytes()),
      decoding_key: DecodingKey::from_secret(secret.as_bytes()),
      ttl_ms: get_timelength_in_ms(
        config.jwt_ttl.to_string().parse()?,
      ),
      exchange_tokens: Default::default(),
    })
  }

  pub fn encode(
    &self,
    user_id: String,
  ) -> anyhow::Result<JwtResponse> {
    let iat = unix_timestamp_ms();
    let exp = iat + self.ttl_ms;
    let claims = JwtClaims {
      id: user_id.clone(),
      iat,
      exp,
    };
    let jwt = encode(&self.header, &claims, &self.encoding_key)
      .context("Failed at signing claim")?;
    Ok(JwtResponse { user_id, jwt })
  }

  pub fn decode(&self, jwt: &str) -> anyhow::Result<JwtClaims> {
    decode::<JwtClaims>(jwt, &self.decoding_key, &self.validation)
      .map(|res| res.claims)
      .context("Failed to decode token claims")
  }

  pub async fn create_exchange_token(
    &self,
    jwt: JwtResponse,
  ) -> String {
    let exchange_token = random_string(40);
    self.exchange_tokens.lock().await.insert(
      exchange_token.clone(),
      (
        jwt,
        unix_timestamp_ms()
          + get_timelength_in_ms(Timelength::OneMinute),
      ),
    );
    exchange_token
  }

  pub async fn redeem_exchange_token(
    &self,
    exchange_token: &str,
  ) -> serror::Result<JwtResponse> {
    let (jwt, valid_until) = self
      .exchange_tokens
      .lock()
      .await
      .remove(exchange_token)
      .context("Invalid exchange token")
      .status_code(StatusCode::UNAUTHORIZED)?;
    // Apply clock skew tolerance.
    // Token is valid if expiration is greater than (now - tolerance)
    if valid_until
      > unix_timestamp_ms()
        .saturating_sub(EXCHANGE_TOKEN_CLOCK_SKEW_TOLERANCE_MS)
    {
      Ok(jwt)
    } else {
      Err(
        anyhow!("Invalid exchange token")
          .status_code(StatusCode::UNAUTHORIZED),
      )
    }
  }
}
