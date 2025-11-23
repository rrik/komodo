use komodo_client::entities::{
  SearchCombinator,
  docker::{
    SwarmLists, config::SwarmConfig, node::SwarmNode,
    secret::SwarmSecret, service::SwarmService,
    stack::SwarmStackLists, swarm::SwarmInspectInfo, task::SwarmTask,
  },
  update::Log,
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

/// Get a swarm service's logs.
///
/// https://docs.docker.com/reference/cli/docker/service/logs/
#[derive(Debug, Clone, Serialize, Deserialize, Resolve)]
#[response(Log)]
#[error(anyhow::Error)]
pub struct GetSwarmServiceLog {
  /// The name or id of service.
  /// Also accepts task id.
  pub service: String,
  /// Pass `--tail` for only recent log contents. Max of 5000
  #[serde(default = "default_tail")]
  pub tail: u64,
  /// Enable `--timestamps`
  #[serde(default)]
  pub timestamps: bool,
  /// Enable `--no-task-ids`
  #[serde(default)]
  pub no_task_ids: bool,
  /// Enable `--no-resolve`
  #[serde(default)]
  pub no_resolve: bool,
  /// Enable `--details`
  #[serde(default)]
  pub details: bool,
}

fn default_tail() -> u64 {
  50
}

//

/// Search a swarm service's logs.
///
/// https://docs.docker.com/reference/cli/docker/service/logs/
#[derive(Debug, Clone, Serialize, Deserialize, Resolve)]
#[response(Log)]
#[error(anyhow::Error)]
pub struct GetSwarmServiceLogSearch {
  /// The name or id of service.
  /// Also accepts task id.
  pub service: String,
  /// The search terms.
  pub terms: Vec<String>,
  /// And: Only lines matching all terms
  /// Or: Lines matching any one of the terms
  #[serde(default)]
  pub combinator: SearchCombinator,
  /// Invert the search (search for everything not matching terms)
  #[serde(default)]
  pub invert: bool,
  /// Enable `--timestamps`
  #[serde(default)]
  pub timestamps: bool,
  /// Enable `--no-task-ids`
  #[serde(default)]
  pub no_task_ids: bool,
  /// Enable `--no-resolve`
  #[serde(default)]
  pub no_resolve: bool,
  /// Enable `--details`
  #[serde(default)]
  pub details: bool,
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

// =======
//  Stack
// =======

#[derive(Debug, Clone, Serialize, Deserialize, Resolve)]
#[response(SwarmStackLists)]
#[error(anyhow::Error)]
pub struct InspectSwarmStack {
  /// The swarm stack name
  pub name: String,
}
