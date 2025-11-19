use anyhow::Context as _;
use komodo_client::entities::docker::{
  SwarmLists, node::SwarmNode, secret::SwarmSecret,
  service::SwarmService, task::SwarmTask,
};
use periphery_client::api::swarm::{
  InspectSwarmNode, InspectSwarmSecret, InspectSwarmService,
  InspectSwarmTask, PollSwarmStatus, PollSwarmStatusResponse,
};
use resolver_api::Resolve;

use crate::state::docker_client;

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
    let (inspect, nodes, services, tasks, secrets) = tokio::join!(
      client.inspect_swarm(),
      client.list_swarm_nodes(),
      client.list_swarm_services(),
      client.list_swarm_tasks(),
      client.list_swarm_secrets(),
    );
    Ok(PollSwarmStatusResponse {
      inspect: inspect.ok(),
      lists: SwarmLists {
        nodes: nodes.unwrap_or_default(),
        services: services.unwrap_or_default(),
        tasks: tasks.unwrap_or_default(),
        secrets: secrets.unwrap_or_default(),
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
