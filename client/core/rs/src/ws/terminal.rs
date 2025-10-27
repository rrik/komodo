use tokio::net::TcpStream;
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};

use crate::{KomodoClient, api::terminal::ConnectTerminalQuery};

impl KomodoClient {
  pub async fn connect_terminal_websocket(
    &self,
    query: &ConnectTerminalQuery,
  ) -> anyhow::Result<WebSocketStream<MaybeTlsStream<TcpStream>>> {
    self
      .connect_login_user_websocket(
        "/terminal",
        Some(&serde_qs::to_string(query)?),
      )
      .await
  }
}
