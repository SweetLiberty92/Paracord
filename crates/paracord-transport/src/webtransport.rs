//! HTTP/3 WebTransport session handling for browser clients.
//!
//! Wraps h3 + h3-quinn to accept WebTransport sessions over HTTP/3,
//! providing the same datagram/stream interface as native QUIC connections.

use std::net::SocketAddr;
use std::sync::Arc;

use bytes::Bytes;
use h3::ext::Protocol;
use h3::server::Connection as H3Connection;
use quinn::crypto::rustls::QuicServerConfig;

use crate::endpoint::TlsConfig;

#[derive(Debug, thiserror::Error)]
pub enum WebTransportError {
    #[error("h3 connection error: {0}")]
    H3Connection(#[from] h3::error::ConnectionError),
    #[error("h3 stream error: {0}")]
    H3Stream(#[from] h3::error::StreamError),
    #[error("quinn error: {0}")]
    Quinn(#[from] quinn::ConnectionError),
    #[error("not a WebTransport CONNECT request")]
    NotWebTransport,
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("tls error: {0}")]
    Tls(#[from] rustls::Error),
    #[error("bind error: {0}")]
    Bind(String),
}

/// Configuration for the WebTransport server.
pub struct WebTransportConfig {
    /// Address to bind the QUIC/HTTP3 endpoint on.
    pub bind_addr: SocketAddr,
    /// TLS configuration (cert + key).
    pub tls: TlsConfig,
}

/// A WebTransport server that accepts HTTP/3 connections and upgrades
/// WebTransport sessions.
pub struct WebTransportServer {
    endpoint: quinn::Endpoint,
}

impl WebTransportServer {
    /// Create and bind a new WebTransport server.
    pub fn bind(config: WebTransportConfig) -> Result<Self, WebTransportError> {
        let mut server_crypto = rustls::ServerConfig::builder()
            .with_no_client_auth()
            .with_single_cert(config.tls.cert_chain, config.tls.private_key.clone_key())
            .map_err(WebTransportError::Tls)?;

        // Enable ALPN for HTTP/3
        server_crypto.alpn_protocols = vec![b"h3".to_vec()];

        let server_config = quinn::ServerConfig::with_crypto(Arc::new(
            QuicServerConfig::try_from(server_crypto)
                .map_err(|e| WebTransportError::Bind(e.to_string()))?,
        ));

        let endpoint = quinn::Endpoint::server(server_config, config.bind_addr)
            .map_err(WebTransportError::Io)?;

        Ok(Self { endpoint })
    }

    /// Accept the next incoming QUIC connection for HTTP/3.
    pub async fn accept(&self) -> Option<quinn::Incoming> {
        self.endpoint.accept().await
    }

    /// Handle an accepted QUIC connection as HTTP/3 with WebTransport support.
    ///
    /// This sets up the h3 server connection with WebTransport, extended CONNECT,
    /// and datagram support enabled.
    pub async fn handle_connection(
        conn: quinn::Connection,
    ) -> Result<H3Session, WebTransportError> {
        let h3_conn = h3::server::builder()
            .enable_webtransport(true)
            .enable_extended_connect(true)
            .enable_datagram(true)
            .build(h3_quinn::Connection::new(conn.clone()))
            .await?;

        Ok(H3Session {
            h3_conn,
            quinn_conn: conn,
        })
    }

    /// Returns the local address this server is bound to.
    pub fn local_addr(&self) -> std::io::Result<SocketAddr> {
        self.endpoint.local_addr()
    }

    /// Close the WebTransport server.
    pub fn close(&self) {
        self.endpoint.close(quinn::VarInt::from_u32(0), b"shutdown");
    }
}

/// An active HTTP/3 session that can accept WebTransport upgrades.
pub struct H3Session {
    h3_conn: H3Connection<h3_quinn::Connection, Bytes>,
    quinn_conn: quinn::Connection,
}

impl H3Session {
    /// Accept the next WebTransport session request.
    ///
    /// Returns `Ok(Some(session))` if a WebTransport CONNECT request was received,
    /// `Ok(None)` if the connection closed, or `Err` on protocol error.
    pub async fn accept_session(
        &mut self,
    ) -> Result<Option<WebTransportSession>, WebTransportError> {
        loop {
            let resolver = match self.h3_conn.accept().await? {
                Some(resolver) => resolver,
                None => return Ok(None),
            };

            let (request, _stream) = resolver.resolve_request().await?;
            let (parts, _body) = request.into_parts();

            // Check if this is a WebTransport CONNECT request
            let is_webtransport = parts.extensions.get::<Protocol>()
                == Some(&Protocol::WEB_TRANSPORT);

            if is_webtransport {
                return Ok(Some(WebTransportSession {
                    quinn_conn: self.quinn_conn.clone(),
                    path: parts.uri.path().to_string(),
                }));
            }

            tracing::debug!(
                method = %parts.method,
                uri = %parts.uri,
                "ignoring non-WebTransport HTTP/3 request"
            );
        }
    }
}

/// A WebTransport session wrapping the underlying QUIC connection.
///
/// Provides the same datagram/stream interface as `MediaConnection`
/// so browser clients can interop with native QUIC clients.
pub struct WebTransportSession {
    quinn_conn: quinn::Connection,
    path: String,
}

impl WebTransportSession {
    /// The request path from the CONNECT request.
    pub fn path(&self) -> &str {
        &self.path
    }

    /// Send an unreliable datagram (for media packets).
    pub fn send_datagram(&self, data: Bytes) -> Result<(), quinn::SendDatagramError> {
        self.quinn_conn.send_datagram(data)
    }

    /// Receive an unreliable datagram.
    pub async fn read_datagram(&self) -> Result<Bytes, quinn::ConnectionError> {
        self.quinn_conn.read_datagram().await
    }

    /// Open a bidirectional stream.
    pub async fn open_bi(
        &self,
    ) -> Result<(quinn::SendStream, quinn::RecvStream), quinn::ConnectionError> {
        self.quinn_conn.open_bi().await
    }

    /// Accept a bidirectional stream from the browser.
    pub async fn accept_bi(
        &self,
    ) -> Result<(quinn::SendStream, quinn::RecvStream), quinn::ConnectionError> {
        self.quinn_conn.accept_bi().await
    }

    /// Remote address of the browser client.
    pub fn remote_address(&self) -> SocketAddr {
        self.quinn_conn.remote_address()
    }

    /// Close the session.
    pub fn close(&self, reason: &str) {
        self.quinn_conn
            .close(quinn::VarInt::from_u32(1), reason.as_bytes());
    }
}
