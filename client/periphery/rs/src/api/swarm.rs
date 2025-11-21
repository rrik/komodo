use komodo_client::entities::docker::{
  SwarmLists, config::SwarmConfig, node::SwarmNode,
  secret::SwarmSecret, service::SwarmService,
  swarm::SwarmInspectInfo, task::SwarmTask,
};
use resolver_api::Resolve;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Resolve)]
#[response(PollSwarmStatusResponse)]
#[error(anyhow::Error)]
pub struct PollSwarmStatus {}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PollSwarmStatusResponse {
  /// Inspect swarm response
  pub inspect: Option<SwarmInspectInfo>,
  pub lists: SwarmLists,
}

// ======
//  Node
// ======

#[derive(Debug, Clone, Serialize, Deserialize, Resolve)]
#[response(SwarmNode)]
#[error(anyhow::Error)]
pub struct InspectSwarmNode {
  pub name: String,
}

// =========
//  Service
// =========

#[derive(Debug, Clone, Serialize, Deserialize, Resolve)]
#[response(SwarmService)]
#[error(anyhow::Error)]
pub struct InspectSwarmService {
  pub name: String,
}

// ======
//  Task
// ======

#[derive(Debug, Clone, Serialize, Deserialize, Resolve)]
#[response(SwarmTask)]
#[error(anyhow::Error)]
pub struct InspectSwarmTask {
  pub id: String,
}

// ========
//  Secret
// ========

#[derive(Debug, Clone, Serialize, Deserialize, Resolve)]
#[response(SwarmSecret)]
#[error(anyhow::Error)]
pub struct InspectSwarmSecret {
  pub id: String,
}

// ========
//  Config
// ========

#[derive(Debug, Clone, Serialize, Deserialize, Resolve)]
#[response(Vec<SwarmConfig>)]
#[error(anyhow::Error)]
pub struct InspectSwarmConfig {
  pub id: String,
}
