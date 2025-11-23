use anyhow::Context as _;
use command::{
  run_komodo_shell_command, run_komodo_standard_command,
};
use komodo_client::entities::{
  docker::{
    SwarmLists, config::SwarmConfig, node::SwarmNode,
    secret::SwarmSecret, service::SwarmService,
    stack::SwarmStackLists, task::SwarmTask,
  },
  update::Log,
};
use periphery_client::api::swarm::*;
use resolver_api::Resolve;

use crate::{
  docker::{
    config::{inspect_swarm_config, list_swarm_configs},
    stack::{inspect_swarm_stack, list_swarm_stacks},
  },
  helpers::format_log_grep,
  state::docker_client,
};

impl Resolve<super::Args> for PollSwarmStatus {
  async fn resolve(
    self,
    _: &super::Args,
  ) -> anyhow::Result<PollSwarmStatusResponse> {
    let client = docker_client().load();
    let client = client
      .iter()
      .next()
      .context("Could not connect to docker client")?;
    let (inspect, nodes, services, tasks, secrets, configs, stacks) = tokio::join!(
      client.inspect_swarm(),
      client.list_swarm_nodes(),
      client.list_swarm_services(),
      client.list_swarm_tasks(),
      client.list_swarm_secrets(),
      list_swarm_configs(),
      list_swarm_stacks(),
    );
    Ok(PollSwarmStatusResponse {
      inspect: inspect.ok(),
      lists: SwarmLists {
        nodes: nodes.unwrap_or_default(),
        services: services.unwrap_or_default(),
        tasks: tasks.unwrap_or_default(),
        secrets: secrets.unwrap_or_default(),
        configs: configs.unwrap_or_default(),
        stacks: stacks.unwrap_or_default(),
      },
    })
  }
}

// ======
//  Node
// ======

impl Resolve<super::Args> for InspectSwarmNode {
  async fn resolve(
    self,
    _: &super::Args,
  ) -> anyhow::Result<SwarmNode> {
    let client = docker_client().load();
    let client = client
      .iter()
      .next()
      .context("Could not connect to docker client")?;
    client.inspect_swarm_node(&self.name).await
  }
}

// =========
//  Service
// =========

impl Resolve<super::Args> for InspectSwarmService {
  async fn resolve(
    self,
    _: &super::Args,
  ) -> anyhow::Result<SwarmService> {
    let client = docker_client().load();
    let client = client
      .iter()
      .next()
      .context("Could not connect to docker client")?;
    client.inspect_swarm_service(&self.name).await
  }
}

impl Resolve<super::Args> for GetSwarmServiceLog {
  async fn resolve(self, _: &super::Args) -> anyhow::Result<Log> {
    let GetSwarmServiceLog {
      service,
      tail,
      timestamps,
      no_task_ids,
      no_resolve,
      details,
    } = self;
    let timestamps =
      timestamps.then_some(" --timestamps").unwrap_or_default();
    let no_task_ids =
      no_task_ids.then_some(" --no-task-ids").unwrap_or_default();
    let no_resolve =
      no_resolve.then_some(" --no-resolve").unwrap_or_default();
    let details = details.then_some(" --details").unwrap_or_default();
    let command = format!(
      "docker service logs --tail {tail}{timestamps}{no_task_ids}{no_resolve}{details} {service}",
    );
    Ok(
      run_komodo_standard_command(
        "Get Swarm Service Log",
        None,
        command,
      )
      .await,
    )
  }
}

impl Resolve<super::Args> for GetSwarmServiceLogSearch {
  async fn resolve(self, _: &super::Args) -> anyhow::Result<Log> {
    let GetSwarmServiceLogSearch {
      service,
      terms,
      combinator,
      invert,
      timestamps,
      no_task_ids,
      no_resolve,
      details,
    } = self;
    let timestamps =
      timestamps.then_some(" --timestamps").unwrap_or_default();
    let no_task_ids =
      no_task_ids.then_some(" --no-task-ids").unwrap_or_default();
    let no_resolve =
      no_resolve.then_some(" --no-resolve").unwrap_or_default();
    let details = details.then_some(" --details").unwrap_or_default();
    let grep = format_log_grep(&terms, combinator, invert);
    let command = format!(
      "docker service logs --tail 5000{timestamps}{no_task_ids}{no_resolve}{details} {service} 2>&1 | {grep}",
    );
    Ok(
      run_komodo_shell_command(
        "Search Swarm Service Log",
        None,
        command,
      )
      .await,
    )
  }
}

// ======
//  Task
// ======

impl Resolve<super::Args> for InspectSwarmTask {
  async fn resolve(
    self,
    _: &super::Args,
  ) -> anyhow::Result<SwarmTask> {
    let client = docker_client().load();
    let client = client
      .iter()
      .next()
      .context("Could not connect to docker client")?;
    client.inspect_swarm_task(&self.id).await
  }
}

// ========
//  Secret
// ========

impl Resolve<super::Args> for InspectSwarmSecret {
  async fn resolve(
    self,
    _: &super::Args,
  ) -> anyhow::Result<SwarmSecret> {
    let client = docker_client().load();
    let client = client
      .iter()
      .next()
      .context("Could not connect to docker client")?;
    client.inspect_swarm_secret(&self.id).await
  }
}

// ========
//  Config
// ========

impl Resolve<super::Args> for InspectSwarmConfig {
  async fn resolve(
    self,
    _: &super::Args,
  ) -> anyhow::Result<Vec<SwarmConfig>> {
    inspect_swarm_config(&self.id).await
  }
}

// =======
//  Stack
// =======

impl Resolve<super::Args> for InspectSwarmStack {
  async fn resolve(
    self,
    _: &super::Args,
  ) -> anyhow::Result<SwarmStackLists> {
    inspect_swarm_stack(self.name).await
  }
}
