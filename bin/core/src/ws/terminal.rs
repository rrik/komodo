use axum::{
  extract::{WebSocketUpgrade, ws::Message},
  response::IntoResponse,
};
use futures_util::SinkExt;
use komodo_client::{
  api::terminal::ConnectTerminalQuery, entities::user::User,
};

use crate::{
  helpers::terminal::setup_target_for_user,
  periphery::{PeripheryClient, terminal::ConnectTerminalResponse},
  ws::forward_ws_channel,
};

#[instrument("ConnectTerminal", skip(ws))]
pub async fn handler(
  super::Qs(query): super::Qs<ConnectTerminalQuery>,
  ws: WebSocketUpgrade,
) -> impl IntoResponse {
  ws.on_upgrade(|socket| async move {
    let Some((mut client_socket, user)) =
      super::user_ws_login(socket).await
    else {
      return;
    };

    let (periphery, response) =
      match setup_forwarding(query, &user).await {
        Ok(response) => response,
        Err(e) => {
          let _ = client_socket
            .send(Message::text(format!("ERROR: {e:#}")))
            .await;
          let _ = client_socket.close().await;
          return;
        }
      };

    forward_ws_channel(periphery, client_socket, response).await
  })
}

async fn setup_forwarding(
  ConnectTerminalQuery {
    target,
    terminal,
    init,
  }: ConnectTerminalQuery,
  user: &User,
) -> anyhow::Result<(PeripheryClient, ConnectTerminalResponse)> {
  let (target, terminal, periphery) =
    setup_target_for_user(target, terminal, init, user).await?;
  let response = periphery.connect_terminal(terminal, target).await?;
  Ok((periphery, response))
}
