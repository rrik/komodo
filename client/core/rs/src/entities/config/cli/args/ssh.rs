#[derive(Debug, Clone, clap::Parser)]
pub struct Ssh {
  /// The server to connect to.
  pub server: String,

  /// Custom command to use to start the shell, eg `bash`.
  /// Defaults to Periphery default.
  pub command: Option<String>,

  /// The terminal name to connect to. Default: `ssh`
  #[arg(long, short = 'n', default_value_t = String::from("ssh"))]
  pub name: String,

  /// Force fresh terminal to replace existing one.
  #[arg(long, short = 'r', default_value_t = false)]
  pub recreate: bool,
}
