use std::net::{IpAddr, SocketAddr};

/// Ports that Paracord needs forwarded for full functionality.
struct PortMapping {
    internal: u16,
    external: u16,
    protocol: igd_next::PortMappingProtocol,
    description: &'static str,
}

/// Result of a successful UPnP setup.
pub struct UpnpResult {
    pub external_ip: IpAddr,
    pub server_port: u16,
    pub livekit_port: u16,
}

/// Discover the UPnP gateway, forward all required ports, and return the external IP.
///
/// `server_port` is the external port for the Paracord HTTP server.
/// `livekit_port` is the external port for the LiveKit signaling server.
/// `lease_seconds` is how long each mapping lasts (0 = permanent on some routers).
pub async fn setup_upnp(
    server_port: u16,
    livekit_port: u16,
    lease_seconds: u32,
) -> anyhow::Result<UpnpResult> {
    tracing::info!("Discovering UPnP gateway on your network...");

    let gateway = igd_next::aio::tokio::search_gateway(igd_next::SearchOptions {
        timeout: Some(std::time::Duration::from_secs(5)),
        ..Default::default()
    })
    .await
    .map_err(|e| anyhow::anyhow!("UPnP gateway not found: {}. You may need to forward ports manually.", e))?;

    let external_ip = gateway.get_external_ip().await
        .map_err(|e| anyhow::anyhow!("Could not get external IP from router: {}", e))?;

    tracing::info!("UPnP gateway found! External IP: {}", external_ip);

    // Get local IP by finding which address we use to reach the gateway
    let local_ip = get_local_ip(gateway.addr)?;

    let mappings = vec![
        PortMapping {
            internal: server_port,
            external: server_port,
            protocol: igd_next::PortMappingProtocol::TCP,
            description: "Paracord Server",
        },
        PortMapping {
            internal: livekit_port,
            external: livekit_port,
            protocol: igd_next::PortMappingProtocol::TCP,
            description: "Paracord LiveKit Signaling",
        },
        PortMapping {
            internal: livekit_port + 1,
            external: livekit_port + 1,
            protocol: igd_next::PortMappingProtocol::TCP,
            description: "Paracord LiveKit TURN",
        },
    ];

    // Add UDP ports for LiveKit media (7882-7892)
    let udp_start = livekit_port + 2;
    let udp_end = livekit_port + 12;

    for port in udp_start..=udp_end {
        let local_addr = SocketAddr::new(local_ip, port);
        match gateway
            .add_port(
                igd_next::PortMappingProtocol::UDP,
                port,
                local_addr,
                lease_seconds,
                "Paracord LiveKit Media",
            )
            .await
        {
            Ok(()) => {}
            Err(igd_next::AddPortError::PortInUse) => {
                tracing::debug!("UDP port {} already mapped (likely ours)", port);
            }
            Err(e) => {
                tracing::warn!("Failed to map UDP port {}: {}", port, e);
            }
        }
    }

    // Map TCP ports
    for mapping in &mappings {
        let local_addr = SocketAddr::new(local_ip, mapping.internal);
        match gateway
            .add_port(
                mapping.protocol,
                mapping.external,
                local_addr,
                lease_seconds,
                mapping.description,
            )
            .await
        {
            Ok(()) => {
                tracing::info!(
                    "  Forwarded {} port {} -> {}:{}",
                    match mapping.protocol {
                        igd_next::PortMappingProtocol::TCP => "TCP",
                        igd_next::PortMappingProtocol::UDP => "UDP",
                    },
                    mapping.external,
                    local_ip,
                    mapping.internal
                );
            }
            Err(igd_next::AddPortError::PortInUse) => {
                tracing::debug!(
                    "Port {} already mapped (likely ours from a previous run)",
                    mapping.external
                );
            }
            Err(e) => {
                tracing::warn!(
                    "Failed to forward {} port {}: {}",
                    mapping.description,
                    mapping.external,
                    e
                );
            }
        }
    }

    tracing::info!(
        "UPnP port forwarding complete. UDP range {}-{} forwarded.", udp_start, udp_end
    );

    Ok(UpnpResult {
        external_ip,
        server_port,
        livekit_port,
    })
}

/// Remove UPnP port mappings on shutdown.
pub async fn cleanup_upnp(server_port: u16, livekit_port: u16) {
    let gateway = match igd_next::aio::tokio::search_gateway(igd_next::SearchOptions {
        timeout: Some(std::time::Duration::from_secs(3)),
        ..Default::default()
    })
    .await
    {
        Ok(gw) => gw,
        Err(_) => return,
    };

    let tcp_ports = [server_port, livekit_port, livekit_port + 1];
    for port in tcp_ports {
        let _ = gateway
            .remove_port(igd_next::PortMappingProtocol::TCP, port)
            .await;
    }
    let udp_start = livekit_port + 2;
    let udp_end = livekit_port + 12;
    for port in udp_start..=udp_end {
        let _ = gateway
            .remove_port(igd_next::PortMappingProtocol::UDP, port)
            .await;
    }
    tracing::info!("UPnP port mappings removed.");
}

/// Detect our local IP by connecting a UDP socket to the gateway address.
fn get_local_ip(gateway_addr: SocketAddr) -> anyhow::Result<IpAddr> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0")?;
    socket.connect(gateway_addr)?;
    Ok(socket.local_addr()?.ip())
}
