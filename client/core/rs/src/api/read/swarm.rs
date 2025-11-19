use derive_empty_traits::EmptyTraits;
use resolver_api::Resolve;
use serde::{Deserialize, Serialize};
use typeshare::typeshare;

use crate::entities::swarm::{
  Swarm, SwarmActionState, SwarmListItem, SwarmQuery,
};

use super::KomodoReadRequest;

//

/// Get a specific swarm. Response: [Swarm].
#[typeshare]
#[derive(
  Serialize, Deserialize, Debug, Clone, Resolve, EmptyTraits,
)]
#[empty_traits(KomodoReadRequest)]
#[response(Swarm)]
#[error(serror::Error)]
pub struct GetSwarm {
  /// Id or name
  #[serde(alias = "id", alias = "name")]
  pub swarm: String,
}

#[typeshare]
pub type GetSwarmResponse = Swarm;

//

/// List Swarms matching optional query. Response: [ListSwarmsResponse].
#[typeshare]
#[derive(
  Serialize, Deserialize, Debug, Clone, Default, Resolve, EmptyTraits,
)]
#[empty_traits(KomodoReadRequest)]
#[response(ListSwarmsResponse)]
#[error(serror::Error)]
pub struct ListSwarms {
  /// Optional structured query to filter Swarms.
  #[serde(default)]
  pub query: SwarmQuery,
}

#[typeshare]
pub type ListSwarmsResponse = Vec<SwarmListItem>;

//

/// List Swarms matching optional query. Response: [ListFullSwarmsResponse].
#[typeshare]
#[derive(
  Serialize, Deserialize, Debug, Clone, Default, Resolve, EmptyTraits,
)]
#[empty_traits(KomodoReadRequest)]
#[response(ListFullSwarmsResponse)]
#[error(serror::Error)]
pub struct ListFullSwarms {
  /// optional structured query to filter swarms.
  #[serde(default)]
  pub query: SwarmQuery,
}

#[typeshare]
pub type ListFullSwarmsResponse = Vec<Swarm>;

//

/// Get current action state for the swarm. Response: [SwarmActionState].
#[typeshare]
#[derive(
  Serialize, Deserialize, Debug, Clone, Resolve, EmptyTraits,
)]
#[empty_traits(KomodoReadRequest)]
#[response(GetSwarmActionStateResponse)]
#[error(serror::Error)]
pub struct GetSwarmActionState {
  /// Id or name
  #[serde(alias = "id", alias = "name")]
  pub swarm: String,
}

#[typeshare]
pub type GetSwarmActionStateResponse = SwarmActionState;

//

/// Gets a summary of data relating to all swarms.
/// Response: [GetSwarmsSummaryResponse].
#[typeshare]
#[derive(
  Serialize, Deserialize, Debug, Clone, Resolve, EmptyTraits,
)]
#[empty_traits(KomodoReadRequest)]
#[response(GetSwarmsSummaryResponse)]
#[error(serror::Error)]
pub struct GetSwarmsSummary {}

/// Response for [GetSwarmsSummary]
#[typeshare]
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GetSwarmsSummaryResponse {
  /// The total number of Swarms
  pub total: u32,
  /// The number of Swarms with Healthy state.
  pub healthy: u32,
  /// The number of Swarms with Unhealthy state
  pub unhealthy: u32,
  /// The number of Swarms with Unknown state
  pub unknown: u32,
}
