use crate::{
  auth::{auth_api_key_check_enabled, auth_jwt_check_enabled},
  helpers::query::get_user,
  periphery::{PeripheryClient, terminal::ConnectTerminalResponse},
  state::periphery_connections,
};
use anyhow::anyhow;
use axum::{
  Router,
  extract::{
    FromRequestParts,
    ws::{self, WebSocket},
  },
  http::request,
  routing::get,
};
use bytes::Bytes;
use futures_util::{SinkExt, StreamExt};
use komodo_client::{entities::user::User, ws::WsLoginMessage};
use periphery_client::api::terminal::DisconnectTerminal;
use serde::de::DeserializeOwned;
use tokio_util::sync::CancellationToken;

mod terminal;
mod update;

pub fn router() -> Router {
  Router::new()
    // Periphery facing
    .route("/periphery", get(crate::connection::server::handler))
    // User facing
    .route("/update", get(update::handler))
    .route("/terminal", get(terminal::handler))
}

async fn user_ws_login(
  mut socket: WebSocket,
) -> Option<(WebSocket, User)> {
  let login_msg = match socket.recv().await {
    Some(Ok(ws::Message::Text(login_msg))) => {
      LoginMessage::Ok(login_msg.to_string())
    }
    Some(Ok(msg)) => {
      LoginMessage::Err(format!("invalid login message: {msg:?}"))
    }
    Some(Err(e)) => {
      LoginMessage::Err(format!("failed to get login message: {e:?}"))
    }
    None => {
      LoginMessage::Err("failed to get login message".to_string())
    }
  };
  let login_msg = match login_msg {
    LoginMessage::Ok(login_msg) => login_msg,
    LoginMessage::Err(msg) => {
      let _ = socket.send(ws::Message::text(msg)).await;
      let _ = socket.close().await;
      return None;
    }
  };
  match WsLoginMessage::from_json_str(&login_msg) {
    // Login using a jwt
    Ok(WsLoginMessage::Jwt { jwt }) => {
      match auth_jwt_check_enabled(&jwt).await {
        Ok(user) => {
          let _ = socket.send(ws::Message::text("LOGGED_IN")).await;
          Some((socket, user))
        }
        Err(e) => {
          let _ = socket
            .send(ws::Message::text(format!(
              "failed to authenticate user using jwt | {e:#}"
            )))
            .await;
          let _ = socket.close().await;
          None
        }
      }
    }
    // login using api keys
    Ok(WsLoginMessage::ApiKeys { key, secret }) => {
      match auth_api_key_check_enabled(&key, &secret).await {
        Ok(user) => {
          let _ = socket.send(ws::Message::text("LOGGED_IN")).await;
          Some((socket, user))
        }
        Err(e) => {
          let _ = socket
            .send(ws::Message::text(format!(
              "failed to authenticate user using api keys | {e:#}"
            )))
            .await;
          let _ = socket.close().await;
          None
        }
      }
    }
    Err(e) => {
      let _ = socket
        .send(ws::Message::text(format!(
          "failed to parse login message: {e:#}"
        )))
        .await;
      let _ = socket.close().await;
      None
    }
  }
}

enum LoginMessage {
  /// The text message
  Ok(String),
  /// The err message
  Err(String),
}

async fn check_user_valid(user_id: &str) -> anyhow::Result<User> {
  let user = get_user(user_id).await?;
  if !user.enabled {
    return Err(anyhow!("user not enabled"));
  }
  Ok(user)
}

async fn forward_ws_channel(
  periphery: PeripheryClient,
  client_socket: axum::extract::ws::WebSocket,
  ConnectTerminalResponse {
    channel,
    sender: periphery_sender,
    receiver: mut periphery_receiver,
  }: ConnectTerminalResponse,
) {
  let (mut client_send, mut client_receive) = client_socket.split();
  let cancel = CancellationToken::new();

  periphery_receiver.set_cancel(cancel.clone());

  trace!("starting ws exchange");

  let core_to_periphery = async {
    loop {
      let client_recv_res = tokio::select! {
        res = client_receive.next() => res,
        _ = cancel.cancelled() => {
          let _ = periphery_sender
            .send_terminal(
              channel,
              Err(anyhow!("Client disconnected")),
            )
            .await;
          break;
        }
      };
      match client_recv_res {
        Some(Ok(ws::Message::Binary(bytes))) => {
          if let Err(_e) = periphery_sender
            .send_terminal(channel, Ok(bytes.into()))
            .await
          {
            cancel.cancel();
            break;
          };
        }
        Some(Ok(ws::Message::Text(text))) => {
          let bytes: Bytes = text.into();
          if let Err(_e) = periphery_sender
            .send_terminal(channel, Ok(bytes.into()))
            .await
          {
            cancel.cancel();
            break;
          };
        }
        Some(Ok(ws::Message::Close(_frame))) => {
          cancel.cancel();
          break;
        }
        Some(Err(_e)) => {
          cancel.cancel();
          break;
        }
        None => {
          cancel.cancel();
          break;
        }
        // Ignore
        Some(Ok(_)) => {}
      }
    }
  };

  let periphery_to_core = async {
    loop {
      // Already adheres to cancellation token
      match periphery_receiver.recv().await {
        Ok(Ok(bytes)) => {
          if let Err(e) =
            client_send.send(ws::Message::Binary(bytes.into())).await
          {
            debug!("{e:?}");
            cancel.cancel();
            break;
          };
        }
        Ok(Err(e)) => {
          let _ = client_send
            .send(ws::Message::Text(format!("{e:#}").into()))
            .await;
          let _ = client_send.close().await;
          cancel.cancel();
          break;
        }
        Err(_) => {
          let _ =
            client_send.send(ws::Message::text("STREAM EOF")).await;
          cancel.cancel();
          break;
        }
      }
    }
  };

  tokio::join!(core_to_periphery, periphery_to_core);

  // Cleanup
  if let Err(e) =
    periphery.request(DisconnectTerminal { channel }).await
  {
    warn!(
      "Failed to disconnect Periphery terminal forwarding | {e:#}",
    )
  }
  if let Some(connection) =
    periphery_connections().get(&periphery.id).await
  {
    connection.terminals.remove(&channel).await;
  }
}

pub struct Qs<T>(pub T);

impl<S, T> FromRequestParts<S> for Qs<T>
where
  S: Send + Sync,
  T: DeserializeOwned,
{
  type Rejection = axum::response::Response;

  async fn from_request_parts(
    parts: &mut request::Parts,
    _state: &S,
  ) -> Result<Self, Self::Rejection> {
    let raw = parts.uri.query().unwrap_or_default();
    serde_qs::from_str::<T>(raw).map(Qs).map_err(|e| {
      axum::response::IntoResponse::into_response((
        axum::http::StatusCode::BAD_REQUEST,
        format!("Failed to parse request query: {e}"),
      ))
    })
  }
}
