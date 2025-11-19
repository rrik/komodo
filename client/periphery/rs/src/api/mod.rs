use komodo_client::entities::{
  config::{DockerRegistry, GitProvider},
  update::Log,
};
use resolver_api::Resolve;
use serde::{Deserialize, Serialize};

pub mod build;
pub mod compose;
pub mod container;
pub mod docker;
pub mod git;
pub mod keys;
pub mod poll;
pub mod stats;
pub mod swarm;
pub mod terminal;

//

#[derive(Deserialize, Debug, Clone)]
pub struct CoreConnectionQuery {
  /// Core host (eg demo.komo.do)
  pub core: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct PeripheryConnectionQuery {
  /// Server Id or name
  pub server: String,
}

//

#[derive(Serialize, Deserialize, Debug, Clone, Resolve)]
#[response(GetHealthResponse)]
#[error(anyhow::Error)]
pub struct GetHealth {}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GetHealthResponse {}

//

#[derive(Serialize, Deserialize, Debug, Clone, Resolve)]
#[response(GetVersionResponse)]
#[error(anyhow::Error)]
pub struct GetVersion {}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GetVersionResponse {
  pub version: String,
}

//

#[derive(Serialize, Deserialize, Debug, Clone, Resolve)]
#[response(ListGitProvidersResponse)]
#[error(anyhow::Error)]
pub struct ListGitProviders {}

pub type ListGitProvidersResponse = Vec<GitProvider>;

//

#[derive(Serialize, Deserialize, Debug, Clone, Resolve)]
#[response(ListDockerRegistriesResponse)]
#[error(anyhow::Error)]
pub struct ListDockerRegistries {}

pub type ListDockerRegistriesResponse = Vec<DockerRegistry>;

//

#[derive(Serialize, Deserialize, Debug, Clone, Resolve)]
#[response(Vec<String>)]
#[error(anyhow::Error)]
pub struct ListSecrets {}

//

#[derive(Serialize, Deserialize, Debug, Clone, Resolve)]
#[response(Log)]
#[error(anyhow::Error)]
pub struct PruneSystem {}
