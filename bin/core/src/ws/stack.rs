use axum::{
  extract::{Query, WebSocketUpgrade, ws::Message},
  response::IntoResponse,
};
use futures_util::SinkExt;
use komodo_client::{
  api::terminal::{ConnectStackAttachQuery, ConnectStackExecQuery},
  entities::{
    permission::PermissionLevel, server::Server, stack::Stack,
    terminal::TerminalTarget,
  },
};

use crate::{
  permission::get_check_permissions, resource::get,
  state::stack_status_cache,
};

#[instrument("ConnectStackExec", skip(ws))]
pub async fn exec(
  Query(ConnectStackExecQuery {
    stack,
    service,
    terminal,
    init,
  }): Query<ConnectStackExecQuery>,
  ws: WebSocketUpgrade,
) -> impl IntoResponse {
  ws.on_upgrade(async move |socket| {
    let Some((mut client_socket, target, server, container)) =
      login_get_target_server_container(socket, &stack, service)
        .await
    else {
      return;
    };

    let (periphery, response) =
      match super::setup_container_exec_terminal(
        target, &server, container, terminal, init,
      )
      .await
      {
        Ok(response) => response,
        Err(e) => {
          let _ = client_socket
            .send(Message::text(format!("ERROR: {e:#}")))
            .await;
          let _ = client_socket.close().await;
          return;
        }
      };

    super::forward_ws_channel(periphery, client_socket, response)
      .await
  })
}

#[instrument("ConnectStackAttach", skip(ws))]
pub async fn attach(
  Query(ConnectStackAttachQuery {
    stack,
    service,
    terminal,
  }): Query<ConnectStackAttachQuery>,
  ws: WebSocketUpgrade,
) -> impl IntoResponse {
  ws.on_upgrade(async move |socket| {
    let Some((mut client_socket, target, server, container)) =
      login_get_target_server_container(socket, &stack, service)
        .await
    else {
      return;
    };

    let (periphery, response) =
      match super::setup_container_attach_terminal(
        target, &server, container, terminal,
      )
      .await
      {
        Ok(response) => response,
        Err(e) => {
          let _ = client_socket
            .send(Message::text(format!("ERROR: {e:#}")))
            .await;
          let _ = client_socket.close().await;
          return;
        }
      };

    super::forward_ws_channel(periphery, client_socket, response)
      .await
  })
}

async fn login_get_target_server_container(
  socket: axum::extract::ws::WebSocket,
  stack: &str,
  service: String,
) -> Option<(
  axum::extract::ws::WebSocket,
  TerminalTarget,
  Server,
  String,
)> {
  let (mut client_socket, user) =
    super::user_ws_login(socket).await?;

  let stack = match get_check_permissions::<Stack>(
    stack,
    &user,
    PermissionLevel::Read.terminal(),
  )
  .await
  {
    Ok(stack) => stack,
    Err(e) => {
      debug!("could not get stack | {e:#}");
      let _ = client_socket
        .send(Message::text(format!("ERROR: {e:#}")))
        .await;
      let _ = client_socket.close().await;
      return None;
    }
  };

  let server = match get::<Server>(&stack.config.server_id).await {
    Ok(server) => server,
    Err(e) => {
      debug!("could not get server | {e:#}");
      let _ = client_socket
        .send(Message::text(format!("ERROR: {e:#}")))
        .await;
      let _ = client_socket.close().await;
      return None;
    }
  };

  let Some(status) = stack_status_cache().get(&stack.id).await else {
    debug!("could not get stack status");
    let _ = client_socket
      .send(Message::text(String::from(
        "ERROR: could not get stack status",
      )))
      .await;
    let _ = client_socket.close().await;
    return None;
  };

  let container = match status
    .curr
    .services
    .iter()
    .find(|s| s.service == service)
    .map(|s| s.container.as_ref())
  {
    Some(Some(container)) => container.name.clone(),
    Some(None) => {
      let _ = client_socket
        .send(Message::text(format!(
          "ERROR: Service {service} container could not be found"
        )))
        .await;
      let _ = client_socket.close().await;
      return None;
    }
    None => {
      let _ = client_socket
        .send(Message::text(format!(
          "ERROR: Service {service} could not be found"
        )))
        .await;
      let _ = client_socket.close().await;
      return None;
    }
  };

  let target = TerminalTarget::Stack {
    stack: stack.id,
    service: Some(service),
  };

  Some((client_socket, target, server, container))
}
