use serde::{Deserialize, Serialize};
use strum::AsRefStr;
use typeshare::typeshare;

use crate::entities::I64;

/// Represents an active terminal on a server.
/// Retrieve with [ListTerminals][crate::api::read::server::ListTerminals].
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Terminal {
  /// The name of the terminal.
  pub name: String,
  /// The target resource of the Terminal.
  pub target: TerminalTarget,
  /// The command used to init the shell.
  pub command: String,
  /// The size of the terminal history in memory.
  pub stored_size_kb: f64,
  /// When the Terminal was created.
  /// Unix timestamp milliseconds.
  pub created_at: I64,
}

#[typeshare]
#[derive(
  Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize,
)]
#[serde(tag = "type", content = "params")]
pub enum TerminalTarget {
  Server {
    server: Option<String>,
  },
  Container {
    server: String,
    container: String,
  },
  Stack {
    stack: String,
    service: Option<String>,
  },
  Deployment {
    deployment: String,
  },
}

impl TerminalTarget {
  // Checks for target match in a fixed server context.
  pub fn matches_on_server(&self, other: &TerminalTarget) -> bool {
    match (self, other) {
      (
        TerminalTarget::Server { .. },
        TerminalTarget::Server { .. },
      ) => true,
      (
        TerminalTarget::Container {
          container: target, ..
        },
        TerminalTarget::Container { container, .. },
      ) => target == container,
      (
        TerminalTarget::Stack { stack: target, .. },
        TerminalTarget::Stack { stack, .. },
      ) => target == stack,
      (
        TerminalTarget::Deployment { deployment: target },
        TerminalTarget::Deployment { deployment },
      ) => target == deployment,
      _ => false,
    }
  }
}

/// JSON structure to send new terminal window dimensions
#[typeshare]
#[derive(Clone, Serialize, Deserialize)]
pub struct ResizeDimensions {
  pub rows: u16,
  pub cols: u16,
}

/// Specify the container terminal mode (exec or attach)
#[typeshare]
#[derive(
  Debug, Clone, Copy, Default, Serialize, Deserialize, AsRefStr,
)]
#[serde(rename_all = "lowercase")]
#[strum(serialize_all = "lowercase")]
pub enum ContainerTerminalMode {
  #[default]
  Exec,
  Attach,
}

/// Configures the behavior of [CreateTerminal] if the
/// specified terminal name already exists.
#[typeshare]
#[derive(
  Debug, Clone, Copy, Default, Serialize, Deserialize, AsRefStr,
)]
pub enum TerminalRecreateMode {
  /// Never kill the old terminal if it already exists.
  /// If the init command is different, returns error.
  #[default]
  Never,
  /// Always kill the old terminal and create new one
  Always,
  /// Only kill and recreate if the command is different.
  DifferentCommand,
}
