use anyhow::Context;
use axum::{Extension, Router, middleware, routing::post};
use komodo_client::{
  api::terminal::*,
  entities::{
    deployment::Deployment, permission::PermissionLevel,
    server::Server, stack::Stack, user::User,
  },
};
use serror::Json;

use crate::{
  auth::auth_request, helpers::periphery_client,
  permission::get_check_permissions, resource::get,
  state::stack_status_cache,
};

pub fn router() -> Router {
  Router::new()
    .route("/execute", post(execute_terminal))
    .route("/execute/container", post(execute_container_exec))
    .route("/execute/deployment", post(execute_deployment_exec))
    .route("/execute/stack", post(execute_stack_exec))
    .layer(middleware::from_fn(auth_request))
}

// =================
//  ExecuteTerminal
// =================

#[instrument(
  name = "ExecuteTerminal",
  skip_all,
  fields(
    operator = user.id,
    server,
    terminal,
  )
)]
async fn execute_terminal(
  Extension(user): Extension<User>,
  Json(ExecuteTerminalBody {
    server,
    terminal,
    command,
  }): Json<ExecuteTerminalBody>,
) -> serror::Result<axum::body::Body> {
  info!("/terminal/execute request | user: {}", user.username);

  let server = get_check_permissions::<Server>(
    &server,
    &user,
    PermissionLevel::Read.terminal(),
  )
  .await?;

  let stream = periphery_client(&server)
    .await?
    .execute_terminal(terminal, command)
    .await
    .context("Failed to execute command on periphery")?;

  Ok(axum::body::Body::from_stream(stream))
}

// ======================
//  ExecuteContainerExec
// ======================

#[instrument(
  name = "ExecuteContainerExec",
  skip_all,
  fields(
    operator = user.id,
    server,
    container,
    shell,
    recreate = format!("{recreate:?}"),
  )
)]
async fn execute_container_exec(
  Extension(user): Extension<User>,
  Json(ExecuteContainerExecBody {
    server,
    container,
    shell,
    command,
    recreate,
  }): Json<ExecuteContainerExecBody>,
) -> serror::Result<axum::body::Body> {
  info!("ExecuteContainerExec request | user: {}", user.username);

  let server = get_check_permissions::<Server>(
    &server,
    &user,
    PermissionLevel::Read.terminal(),
  )
  .await?;

  let periphery = periphery_client(&server).await?;

  let stream = periphery
    .execute_container_exec(container, shell, command, recreate)
    .await
    .context(
      "Failed to execute container exec command on periphery",
    )?;

  Ok(axum::body::Body::from_stream(stream))
}

// =======================
//  ExecuteDeploymentExec
// =======================

#[instrument(
  name = "ExecuteDeploymentExec",
  skip_all,
  fields(
    operator = user.id,
    deployment,
    shell,
    recreate = format!("{recreate:?}"),
  )
)]
async fn execute_deployment_exec(
  Extension(user): Extension<User>,
  Json(ExecuteDeploymentExecBody {
    deployment,
    shell,
    command,
    recreate,
  }): Json<ExecuteDeploymentExecBody>,
) -> serror::Result<axum::body::Body> {
  info!("ExecuteDeploymentExec request | user: {}", user.username);

  let deployment = get_check_permissions::<Deployment>(
    &deployment,
    &user,
    PermissionLevel::Read.terminal(),
  )
  .await?;

  let server = get::<Server>(&deployment.config.server_id).await?;

  let periphery = periphery_client(&server).await?;

  let stream = periphery
    .execute_container_exec(deployment.name, shell, command, recreate)
    .await
    .context(
      "Failed to execute container exec command on periphery",
    )?;

  Ok(axum::body::Body::from_stream(stream))
}

// ==================
//  ExecuteStackExec
// ==================

#[instrument(
  name = "ExecuteStackExec",
  skip_all,
  fields(
    operator = user.id,
    stack,
    service,
    shell,
    recreate = format!("{recreate:?}"),
  )
)]
async fn execute_stack_exec(
  Extension(user): Extension<User>,
  Json(ExecuteStackExecBody {
    stack,
    service,
    shell,
    command,
    recreate,
  }): Json<ExecuteStackExecBody>,
) -> serror::Result<axum::body::Body> {
  info!("ExecuteStackExec request | user: {}", user.username);

  let stack = get_check_permissions::<Stack>(
    &stack,
    &user,
    PermissionLevel::Read.terminal(),
  )
  .await?;

  let server = get::<Server>(&stack.config.server_id).await?;

  let container = stack_status_cache()
    .get(&stack.id)
    .await
    .context("could not get stack status")?
    .curr
    .services
    .iter()
    .find(|s| s.service == service)
    .context("could not find service")?
    .container
    .as_ref()
    .context("could not find service container")?
    .name
    .clone();

  let periphery = periphery_client(&server).await?;

  let stream = periphery
    .execute_container_exec(container, shell, command, recreate)
    .await
    .context(
      "Failed to execute container exec command on periphery",
    )?;

  Ok(axum::body::Body::from_stream(stream))
}
