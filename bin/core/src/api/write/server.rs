use anyhow::Context;
use formatting::{bold, format_serror};
use futures_util::{StreamExt, stream::FuturesUnordered};
use komodo_client::{
  api::write::*,
  entities::{
    NoData, Operation,
    permission::PermissionLevel,
    server::{Server, ServerInfo},
    to_docker_compatible_name,
    update::{Update, UpdateStatus},
  },
};
use periphery_client::api;
use resolver_api::Resolve;

use crate::{
  helpers::{
    periphery_client,
    query::get_all_tags,
    update::{add_update, make_update, update_update},
  },
  permission::get_check_permissions,
  resource::{self, update_server_public_key},
};

use super::WriteArgs;

impl Resolve<WriteArgs> for CreateServer {
  #[instrument(
    "CreateServer",
    skip_all,
    fields(
      operator = user.id,
      server = self.name,
      config = serde_json::to_string(&self.config).unwrap()
    )
  )]
  async fn resolve(
    self,
    WriteArgs { user }: &WriteArgs,
  ) -> serror::Result<Server> {
    resource::create::<Server>(
      &self.name,
      self.config,
      self.public_key.map(|public_key| ServerInfo {
        public_key,
        ..Default::default()
      }),
      user,
    )
    .await
  }
}

impl Resolve<WriteArgs> for CopyServer {
  #[instrument(
    "CopyServer",
    skip_all,
    fields(
      operator = user.id,
      server = self.name,
      copy_server = self.id,
    )
  )]
  async fn resolve(
    self,
    WriteArgs { user }: &WriteArgs,
  ) -> serror::Result<Server> {
    let Server { config, .. } = get_check_permissions::<Server>(
      &self.id,
      user,
      PermissionLevel::Read.into(),
    )
    .await?;

    resource::create::<Server>(
      &self.name,
      config.into(),
      self.public_key.map(|public_key| ServerInfo {
        public_key,
        ..Default::default()
      }),
      user,
    )
    .await
  }
}

impl Resolve<WriteArgs> for DeleteServer {
  #[instrument(
    "DeleteServer",
    skip_all,
    fields(
      operator = user.id,
      server = self.id,
    )
  )]
  async fn resolve(
    self,
    WriteArgs { user }: &WriteArgs,
  ) -> serror::Result<Server> {
    Ok(resource::delete::<Server>(&self.id, user).await?)
  }
}

impl Resolve<WriteArgs> for UpdateServer {
  #[instrument(
    "UpdateServer",
    skip_all,
    fields(
      operator = user.id,
      server = self.id,
      update = serde_json::to_string(&self.config).unwrap(),
    )
  )]
  async fn resolve(
    self,
    WriteArgs { user }: &WriteArgs,
  ) -> serror::Result<Server> {
    Ok(resource::update::<Server>(&self.id, self.config, user).await?)
  }
}

impl Resolve<WriteArgs> for RenameServer {
  #[instrument(
    "RenameServer",
    skip_all,
    fields(
      operator = user.id,
      server = self.id,
      new_name = self.name,
    )
  )]
  async fn resolve(
    self,
    WriteArgs { user }: &WriteArgs,
  ) -> serror::Result<Update> {
    Ok(resource::rename::<Server>(&self.id, &self.name, user).await?)
  }
}

impl Resolve<WriteArgs> for CreateNetwork {
  #[instrument(
    "CreateNetwork",
    skip_all,
    fields(
      operator = user.id,
      server = self.server,
      network = self.name
    )
  )]
  async fn resolve(
    self,
    WriteArgs { user }: &WriteArgs,
  ) -> serror::Result<Update> {
    let server = get_check_permissions::<Server>(
      &self.server,
      user,
      PermissionLevel::Write.into(),
    )
    .await?;

    let periphery = periphery_client(&server).await?;

    let mut update =
      make_update(&server, Operation::CreateNetwork, user);
    update.status = UpdateStatus::InProgress;
    update.id = add_update(update.clone()).await?;

    match periphery
      .request(api::docker::CreateNetwork {
        name: to_docker_compatible_name(&self.name),
        driver: None,
      })
      .await
    {
      Ok(log) => update.logs.push(log),
      Err(e) => update.push_error_log(
        "create network",
        format_serror(&e.context("Failed to create network").into()),
      ),
    };

    update.finalize();
    update_update(update.clone()).await?;

    Ok(update)
  }
}

impl Resolve<WriteArgs> for CreateTerminal {
  #[instrument(
    "CreateTerminal",
    skip_all,
    fields(
      operator = user.id,
      server = self.server,
      terminal = self.name,
      command = self.command,
      recreate = format!("{:?}", self.recreate),
    )
  )]
  async fn resolve(
    self,
    WriteArgs { user }: &WriteArgs,
  ) -> serror::Result<NoData> {
    let server = get_check_permissions::<Server>(
      &self.server,
      user,
      PermissionLevel::Write.terminal(),
    )
    .await?;

    let periphery = periphery_client(&server).await?;

    periphery
      .request(api::terminal::CreateTerminal {
        name: self.name,
        command: self.command,
        recreate: self.recreate,
      })
      .await
      .context("Failed to create terminal on Periphery")?;

    Ok(NoData {})
  }
}

impl Resolve<WriteArgs> for DeleteTerminal {
  #[instrument(
    "DeleteTerminal",
    skip_all,
    fields(
      operator = user.id,
      server = self.server,
      terminal = self.terminal,
    )
  )]
  async fn resolve(
    self,
    WriteArgs { user }: &WriteArgs,
  ) -> serror::Result<NoData> {
    let server = get_check_permissions::<Server>(
      &self.server,
      user,
      PermissionLevel::Write.terminal(),
    )
    .await?;

    let periphery = periphery_client(&server).await?;

    periphery
      .request(api::terminal::DeleteTerminal {
        terminal: self.terminal,
      })
      .await
      .context("Failed to delete terminal on Periphery")?;

    Ok(NoData {})
  }
}

impl Resolve<WriteArgs> for DeleteAllTerminals {
  #[instrument(
    "DeleteAllTerminals",
    skip_all,
    fields(
      operator = user.id,
      server = self.server,
    )
  )]
  async fn resolve(
    self,
    WriteArgs { user }: &WriteArgs,
  ) -> serror::Result<NoData> {
    let server = get_check_permissions::<Server>(
      &self.server,
      user,
      PermissionLevel::Write.terminal(),
    )
    .await?;

    let periphery = periphery_client(&server).await?;

    periphery
      .request(api::terminal::DeleteAllTerminals {})
      .await
      .context("Failed to delete all terminals on Periphery")?;

    Ok(NoData {})
  }
}

//

impl Resolve<WriteArgs> for BatchDeleteAllTerminals {
  #[instrument(
    "BatchDeleteAllTerminals",
    skip_all,
    fields(
      operator = user.id,
      query = format!("{:?}", self.query),
    )
  )]
  async fn resolve(
    self,
    WriteArgs { user }: &WriteArgs,
  ) -> Result<Self::Response, Self::Error> {
    let all_tags = if self.query.tags.is_empty() {
      vec![]
    } else {
      get_all_tags(None).await?
    };

    resource::list_full_for_user::<Server>(
      self.query, user, &all_tags,
    )
    .await?
    .into_iter()
    .map(|server| async move {
      let res = async {
        let periphery = periphery_client(&server).await?;

        periphery
          .request(api::terminal::DeleteAllTerminals {})
          .await
          .context("Failed to delete all terminals on Periphery")?;

        anyhow::Ok(())
      }
      .await;
      if let Err(e) = res {
        warn!(
          "Failed to delete all terminals on {} ({}) | {e:#}",
          server.name, server.id
        )
      }
    })
    .collect::<FuturesUnordered<_>>()
    .collect::<Vec<_>>()
    .await;

    Ok(NoData {})
  }
}

//

impl Resolve<WriteArgs> for UpdateServerPublicKey {
  #[instrument(
    "UpdateServerPublicKey",
    skip_all,
    fields(
      operator = args.user.id,
      server = self.server,
      public_key = self.public_key,
    )
  )]
  async fn resolve(
    self,
    args: &WriteArgs,
  ) -> Result<Self::Response, Self::Error> {
    let server = get_check_permissions::<Server>(
      &self.server,
      &args.user,
      PermissionLevel::Write.into(),
    )
    .await?;

    update_server_public_key(&server.id, &self.public_key).await?;

    let mut update =
      make_update(&server, Operation::UpdateServerKey, &args.user);

    update.push_simple_log(
      "Update Server Public Key",
      format!("Public key updated to {}", bold(&self.public_key)),
    );
    update.finalize();
    update.id = add_update(update.clone()).await?;

    Ok(update)
  }
}

//

impl Resolve<WriteArgs> for RotateServerKeys {
  #[instrument(
    "RotateServerKeys",
    skip_all,
    fields(
      operator = args.user.id,
      server = self.server,
    )
  )]
  async fn resolve(
    self,
    args: &WriteArgs,
  ) -> Result<Self::Response, Self::Error> {
    let server = get_check_permissions::<Server>(
      &self.server,
      &args.user,
      PermissionLevel::Write.into(),
    )
    .await?;

    let periphery = periphery_client(&server).await?;

    let public_key = periphery
      .request(api::keys::RotatePrivateKey {})
      .await
      .context("Failed to rotate Periphery private key")?
      .public_key;

    UpdateServerPublicKey {
      server: server.id,
      public_key,
    }
    .resolve(args)
    .await
  }
}
