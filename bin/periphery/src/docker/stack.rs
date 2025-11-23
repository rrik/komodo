use anyhow::{Context, anyhow};
use command::run_komodo_standard_command;
use komodo_client::entities::docker::stack::{
  SwarmStackListItem, SwarmStackLists, SwarmStackServiceListItem,
  SwarmStackTaskListItem,
};

pub async fn inspect_swarm_stack(
  name: String,
) -> anyhow::Result<SwarmStackLists> {
  let (services, tasks) = tokio::try_join!(
    list_swarm_stack_services(&name),
    list_swarm_stack_tasks(&name),
  )?;
  Ok(SwarmStackLists {
    name,
    services,
    tasks,
  })
}

pub async fn list_swarm_stacks()
-> anyhow::Result<Vec<SwarmStackListItem>> {
  let res = run_komodo_standard_command(
    "List Swarm Stacks",
    None,
    "docker stack ls --format json",
  )
  .await;

  if !res.success {
    return Err(anyhow!("{}", res.combined()).context(
      "Failed to list swarm stacks using 'docker stack ls'",
    ));
  }

  // The output is in JSONL, need to convert to standard JSON vec.
  serde_json::from_str(&format!(
    "[{}]",
    res.stdout.trim().replace('\n', ",")
  ))
  .context("Failed to parse 'docker stack ls' response from json")
}

pub async fn list_swarm_stack_services(
  stack: &str,
) -> anyhow::Result<Vec<SwarmStackServiceListItem>> {
  let res = run_komodo_standard_command(
    "List Swarm Stack Services",
    None,
    format!("docker stack services --format json {stack}"),
  )
  .await;

  if !res.success {
    return Err(anyhow!("{}", res.combined()).context(
      "Failed to list swarm stacks using 'docker stack services'",
    ));
  }

  // The output is in JSONL, need to convert to standard JSON vec.
  serde_json::from_str(&format!(
    "[{}]",
    res.stdout.trim().replace('\n', ",")
  ))
  .context(
    "Failed to parse 'docker stack services' response from json",
  )
}

pub async fn list_swarm_stack_tasks(
  stack: &str,
) -> anyhow::Result<Vec<SwarmStackTaskListItem>> {
  let res = run_komodo_standard_command(
    "List Swarm Stack Tasks",
    None,
    format!("docker stack ps --format json {stack}"),
  )
  .await;

  if !res.success {
    return Err(anyhow!("{}", res.combined()).context(
      "Failed to list swarm stacks using 'docker stack ps'",
    ));
  }

  // The output is in JSONL, need to convert to standard JSON vec.
  serde_json::from_str(&format!(
    "[{}]",
    res.stdout.trim().replace('\n', ",")
  ))
  .context("Failed to parse 'docker stack ps' response from json")
}
