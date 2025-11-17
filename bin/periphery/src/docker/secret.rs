use anyhow::Context;
use bollard::query_parameters::ListSecretsOptions;
use komodo_client::entities::docker::secret::{
  SecretSpec, SwarmSecret,
};

use super::DockerClient;

impl DockerClient {
  pub async fn list_swarm_secrets(
    &self,
  ) -> anyhow::Result<Vec<SwarmSecret>> {
    let secrets = self
      .docker
      .list_secrets(Option::<ListSecretsOptions>::None)
      .await
      .context("Failed to query for swarm secret list")?
      .into_iter()
      .map(convert_secret)
      .collect();
    Ok(secrets)
  }

  pub async fn inspect_swarm_secret(
    &self,
    secret_id: &str,
  ) -> anyhow::Result<SwarmSecret> {
    self
      .docker
      .inspect_secret(secret_id)
      .await
      .map(convert_secret)
      .with_context(|| {
        format!(
          "Failed to query for swarm secret with id {secret_id}"
        )
      })
  }
}

fn convert_secret(secret: bollard::models::Secret) -> SwarmSecret {
  SwarmSecret {
    id: secret.id,
    version: secret.version.map(super::convert_object_version),
    created_at: secret.created_at,
    updated_at: secret.updated_at,
    spec: secret.spec.map(|spec| SecretSpec {
      name: spec.name,
      labels: spec.labels,
      data: spec.data,
      driver: spec.driver.map(super::convert_driver),
      templating: spec.templating.map(super::convert_driver),
    }),
  }
}
