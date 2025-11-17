use anyhow::Context as _;
use komodo_client::entities::docker::{
  node::SwarmNode, secret::SwarmSecret, service::SwarmService,
  task::SwarmTask,
};
use periphery_client::api::swarm::{
  InspectSwarmNode, InspectSwarmSecret, InspectSwarmService,
  InspectSwarmTask,
};
use resolver_api::Resolve;

use crate::state::docker_client;

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
