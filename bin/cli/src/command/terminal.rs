use anyhow::Context;
use bytes::Bytes;
use colored::Colorize;
use futures_util::{SinkExt, StreamExt};
use komodo_client::{
  api::write::{CreateTerminal, TerminalRecreateMode},
  entities::config::cli::args::terminal::{Connect, Exec},
};
use tokio::{
  io::{AsyncReadExt as _, AsyncWriteExt as _},
  net::TcpStream,
};
use tokio_tungstenite::{
  MaybeTlsStream, WebSocketStream, tungstenite,
};
use tokio_util::sync::CancellationToken;

pub async fn handle_connect(
  Connect {
    server,
    name,
    command,
    recreate,
  }: &Connect,
) -> anyhow::Result<()> {
  handle_terminal_forwarding(async {
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
    client.connect_terminal_websocket(server, name).await
  })
  .await
}

pub async fn handle_exec(
  Exec {
    server,
    container,
    shell,
    recreate,
  }: &Exec,
) -> anyhow::Result<()> {
  handle_terminal_forwarding(async {
    super::komodo_client()
      .await?
      .connect_container_websocket(
        server,
        container,
        shell,
        recreate.then_some(TerminalRecreateMode::Always),
      )
      .await
  })
  .await
}

type WsStream = WebSocketStream<MaybeTlsStream<TcpStream>>;

async fn handle_terminal_forwarding<
  C: Future<Output = anyhow::Result<WsStream>>,
>(
  connect: C,
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

  let cancel = CancellationToken::new();

  let forward_resize = async {
    while future_or_cancel(sigwinch.recv(), &cancel)
      .await
      .flatten()
      .is_some()
    {
      if let Ok(resize_message) = resize_message()
        && write_tx.send(resize_message).await.is_err()
      {
        break;
      }
    }
    cancel.cancel();
  };

  let forward_stdin = async {
    let mut stdin = tokio::io::stdin();
    let mut buf = [0u8; 8192];
    while let Some(Ok(n)) = future_or_cancel(
      // Read into buffer starting from index 1,
      // leaving first byte to represent 'data' message.
      stdin.read(&mut buf[1..]),
      &cancel,
    )
    .await
    {
      // EOF
      if n == 0 {
        break;
      }
      // Check for disconnect sequence (alt + q)
      if buf[1..(n + 1)] == [197, 147] {
        break;
      }
      // Forward bytes
      let bytes = Bytes::copy_from_slice(&buf[..(n + 1)]);
      if write_tx.send(bytes).await.is_err() {
        break;
      };
    }
    cancel.cancel();
  };

  // =====================
  //  CONNECT AND FORWARD
  // =====================

  let (mut ws_write, mut ws_read) = connect.await?.split();

  let forward_write = async {
    while let Some(bytes) =
      future_or_cancel(write_rx.recv(), &cancel).await.flatten()
    {
      if let Err(e) =
        ws_write.send(tungstenite::Message::Binary(bytes)).await
      {
        cancel.cancel();
        return Some(e);
      };
    }
    cancel.cancel();
    None
  };

  let forward_read = async {
    let mut stdout = tokio::io::stdout();
    while let Some(msg) =
      future_or_cancel(ws_read.next(), &cancel).await.flatten()
    {
      let bytes = match msg {
        Ok(tungstenite::Message::Binary(bytes)) => bytes,
        Ok(tungstenite::Message::Text(text)) => text.into(),
        Err(e) => {
          cancel.cancel();
          return Some(
            anyhow::Error::from(e).context("Websocket read error"),
          );
        }
        Ok(tungstenite::Message::Close(_)) => break,
        _ => continue,
      };
      if let Err(e) = stdout
        .write_all(&bytes)
        .await
        .context("Failed to write text to stdout")
      {
        cancel.cancel();
        return Some(e);
      }
      let _ = stdout.flush().await;
    }
    cancel.cancel();
    None
  };

  let guard = RawModeGuard::enable_raw_mode()?;

  let (_, _, write_error, read_error) = tokio::join!(
    forward_resize,
    forward_stdin,
    forward_write,
    forward_read
  );

  drop(guard);

  if let Some(e) = write_error {
    eprintln!("\nFailed to forward stdin | {e:#}");
  }

  if let Some(e) = read_error {
    eprintln!("\nFailed to forward stdout | {e:#}");
  }

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

async fn future_or_cancel<T, F: Future<Output = T>>(
  fut: F,
  cancel: &CancellationToken,
) -> Option<T> {
  tokio::select! {
    res = fut => Some(res),
    _ = cancel.cancelled() => None
  }
}
