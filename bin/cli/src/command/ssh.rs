use anyhow::Context;
use bytes::Bytes;
use colored::Colorize;
use futures_util::{SinkExt, StreamExt};
use komodo_client::{
  api::write::{CreateTerminal, TerminalRecreateMode},
  entities::config::cli::args::ssh::Ssh,
};
use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};
use tokio_tungstenite::tungstenite;

pub async fn handle(
  Ssh {
    server,
    name,
    command,
    recreate,
  }: &Ssh,
) -> anyhow::Result<()> {
  // Need to forward multiple sources into ws write
  let (write_tx, mut write_rx) =
    tokio::sync::mpsc::channel::<Bytes>(1024);

  // ================
  //  SETUP RESIZING
  // ================

  // Subscribe to SIGWINCH for resize messages
  let mut sigwinch = tokio::signal::unix::signal(
    tokio::signal::unix::SignalKind::window_change(),
  )
  .context("failed to register SIGWINCH handler")?;

  // Send first resize messsage, bailing if it fails to get the size.
  write_tx.send(resize_message()?).await?;

  let forward_resize = async {
    while sigwinch.recv().await.is_some() {
      if let Ok(resize_message) = resize_message()
        && write_tx.send(resize_message).await.is_err()
      {
        break;
      }
    }
  };

  let forward_stdin = async {
    let mut stdin = tokio::io::stdin();
    let mut buf = [0u8; 8192];
    loop {
      // Read into buffer starting from index 1,
      // leaving first byte to represent 'data' message.
      let n = match stdin.read(&mut buf[1..]).await {
        Ok(0) => break, // EOF
        Ok(n) => n,
        Err(_) => break,
      };
      // Check for disconnect sequence (alt + q)
      if buf[1..(n + 1)] == [197, 147] {
        break;
      }
      let bytes = Bytes::copy_from_slice(&buf[..(n + 1)]);
      if write_tx.send(bytes).await.is_err() {
        break;
      };
    }
  };

  // =====================
  //  CONNECT AND FORWARD
  // =====================

  let client = super::komodo_client().await?;

  // Init the terminal if it doesn't exist already.
  client
    .write(CreateTerminal {
      server: server.to_string(),
      name: name.to_string(),
      command: command.clone(),
      recreate: if *recreate {
        TerminalRecreateMode::Always
      } else {
        TerminalRecreateMode::DifferentCommand
      },
    })
    .await?;

  let (mut ws_write, mut ws_read) = client
    .connect_terminal_websocket(server, name)
    .await?
    .split();

  let forward_write = async {
    while let Some(bytes) = write_rx.recv().await {
      if let Err(e) =
        ws_write.send(tungstenite::Message::Binary(bytes)).await
      {
        return Some(e);
      };
    }
    None
  };

  let forward_read = async {
    let mut stdout = tokio::io::stdout();
    loop {
      match ws_read.next().await {
        Some(Ok(tungstenite::Message::Binary(bytes))) => {
          if let Err(e) =
            tokio::io::copy(&mut bytes.as_ref(), &mut stdout)
              .await
              .context("Failed to copy bytes to stdout")
          {
            return Some(e);
          }
          let _ = stdout.flush().await;
        }
        Some(Ok(tungstenite::Message::Text(text))) => {
          if let Err(e) =
            tokio::io::copy(&mut text.as_ref(), &mut stdout)
              .await
              .context("Failed to copy text to stdout")
          {
            return Some(e);
          }
          let _ = stdout.flush().await;
        }
        Some(Ok(tungstenite::Message::Close(_))) => break,
        Some(Err(e)) => {
          return Some(
            anyhow::Error::from(e).context("Websocket read error"),
          );
        }
        None => break,
        _ => {}
      }
    }
    None
  };

  let guard = RawModeGuard::enable_raw_mode()?;

  tokio::select! {
    _ = forward_resize => drop(guard),
    _ = forward_stdin => drop(guard),
    e = forward_write => {
      drop(guard);
      if let Some(e) = e {
        eprintln!("\nFailed to forward stdin | {e:#}");
      }
    },
    e = forward_read => {
      drop(guard);
      if let Some(e) = e {
        eprintln!("\nFailed to forward stdout | {e:#}");
      }
    },
  };

  println!("\n\n{} {}", "connection".bold(), "closed".red().bold());

  // It doesn't seem to exit by itself after the raw mode stuff.
  std::process::exit(0)
}

fn resize_message() -> anyhow::Result<Bytes> {
  let (cols, rows) = crossterm::terminal::size()
    .context("Failed to get terminal size")?;
  let bytes: Vec<u8> =
    format!(r#"{{"rows":{rows},"cols":{cols}}}"#).into();
  let mut msg = Vec::with_capacity(bytes.len() + 1);
  msg.push(0xff); // resize prefix
  msg.extend(bytes);
  Ok(msg.into())
}

struct RawModeGuard;

impl RawModeGuard {
  fn enable_raw_mode() -> anyhow::Result<Self> {
    crossterm::terminal::enable_raw_mode()
      .context("Failed to enable terminal raw mode")?;
    Ok(Self)
  }
}
impl Drop for RawModeGuard {
  fn drop(&mut self) {
    if let Err(e) = crossterm::terminal::disable_raw_mode() {
      eprintln!("Failed to disable terminal raw mode | {e:?}");
    }
  }
}
