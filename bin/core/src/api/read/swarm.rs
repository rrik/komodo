use anyhow::Context;
use komodo_client::{
  api::read::*,
  entities::{
    permission::PermissionLevel,
    swarm::{Swarm, SwarmActionState, SwarmListItem, SwarmState},
  },
};
use resolver_api::Resolve;

use crate::{
  helpers::query::get_all_tags, permission::get_check_permissions,
  resource, state::{action_states, swarm_status_cache},
};

use super::ReadArgs;

impl Resolve<ReadArgs> for GetSwarm {
  async fn resolve(
    self,
    ReadArgs { user }: &ReadArgs,
  ) -> serror::Result<Swarm> {
    Ok(
      get_check_permissions::<Swarm>(
        &self.swarm,
        user,
        PermissionLevel::Read.into(),
      )
      .await?,
    )
  }
}

impl Resolve<ReadArgs> for ListSwarms {
  async fn resolve(
    self,
    ReadArgs { user }: &ReadArgs,
  ) -> serror::Result<Vec<SwarmListItem>> {
    let all_tags = if self.query.tags.is_empty() {
      vec![]
    } else {
      get_all_tags(None).await?
    };
    Ok(
      resource::list_for_user::<Swarm>(
        self.query,
        user,
        PermissionLevel::Read.into(),
        &all_tags,
      )
      .await?,
    )
  }
}

impl Resolve<ReadArgs> for ListFullSwarms {
  async fn resolve(
    self,
    ReadArgs { user }: &ReadArgs,
  ) -> serror::Result<ListFullSwarmsResponse> {
    let all_tags = if self.query.tags.is_empty() {
      vec![]
    } else {
      get_all_tags(None).await?
    };
    Ok(
      resource::list_full_for_user::<Swarm>(
        self.query,
        user,
        PermissionLevel::Read.into(),
        &all_tags,
      )
      .await?,
    )
  }
}

impl Resolve<ReadArgs> for GetSwarmActionState {
  async fn resolve(
    self,
    ReadArgs { user }: &ReadArgs,
  ) -> serror::Result<SwarmActionState> {
    let swarm = get_check_permissions::<Swarm>(
      &self.swarm,
      user,
      PermissionLevel::Read.into(),
    )
    .await?;
    let action_state = action_states()
      .swarm
      .get(&swarm.id)
      .await
      .unwrap_or_default()
      .get()?;
    Ok(action_state)
  }
}

impl Resolve<ReadArgs> for GetSwarmsSummary {
  async fn resolve(
    self,
    ReadArgs { user }: &ReadArgs,
  ) -> serror::Result<GetSwarmsSummaryResponse> {
    let swarms = resource::list_full_for_user::<Swarm>(
      Default::default(),
      user,
      PermissionLevel::Read.into(),
      &[],
    )
    .await
    .context("failed to get swarms from db")?;

    let mut res = GetSwarmsSummaryResponse::default();

    let cache = swarm_status_cache();

    for swarm in swarms {
      res.total += 1;

      match cache
        .get(&swarm.id)
        .await
        .map(|status| status.state)
        .unwrap_or_default()
      {
        SwarmState::Unknown => {
          res.unknown += 1;
        }
        SwarmState::Healthy => {
          res.healthy += 1;
        }
        SwarmState::Unhealthy => {
          res.unhealthy += 1;
        }
      }
    }

    Ok(res)
  }
}
