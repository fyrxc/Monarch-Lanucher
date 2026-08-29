use crate::models::DayzServer;
use std::net::{SocketAddr, ToSocketAddrs, UdpSocket};
use std::time::{Duration, Instant};

const A2S_INFO_QUERY: &[u8] = b"\xFF\xFF\xFF\xFFTSource Engine Query\x00";
const DEFAULT_TIMEOUT: Duration = Duration::from_millis(1200);

fn resolve_target(server: &DayzServer) -> Result<SocketAddr, String> {
    let address = format!("{}:{}", server.ip.trim(), server.query_port);
    address
        .to_socket_addrs()
        .map_err(|error| format!("failed to resolve server query address: {error}"))?
        .next()
        .ok_or_else(|| "server query address did not resolve".to_string())
}

pub fn query_ping(server: &DayzServer) -> Result<Option<u32>, String> {
    query_ping_with_timeout(server, DEFAULT_TIMEOUT)
}

pub fn query_ping_with_timeout(
    server: &DayzServer,
    timeout: Duration,
) -> Result<Option<u32>, String> {
    if server.query_port == 0 || server.ip.trim().is_empty() {
        return Ok(None);
    }

    let target = resolve_target(server)?;
    let bind_address = if target.is_ipv4() { "0.0.0.0:0" } else { "[::]:0" };
    let socket = UdpSocket::bind(bind_address)
        .map_err(|error| format!("failed to create server query socket: {error}"))?;
    socket
        .set_read_timeout(Some(timeout))
        .map_err(|error| format!("failed to configure server query timeout: {error}"))?;
    socket
        .set_write_timeout(Some(timeout))
        .map_err(|error| format!("failed to configure server query timeout: {error}"))?;

    let started = Instant::now();
    socket
        .send_to(A2S_INFO_QUERY, target)
        .map_err(|error| format!("failed to send server query: {error}"))?;

    let mut response = [0u8; 2048];
    match socket.recv_from(&mut response) {
        Ok((size, _)) if size >= 5 && response[..4] == [0xFF, 0xFF, 0xFF, 0xFF] => {
            Ok(Some(started.elapsed().as_millis().min(u32::MAX as u128) as u32))
        }
        Ok(_) => Ok(None),
        Err(error)
            if error.kind() == std::io::ErrorKind::WouldBlock
                || error.kind() == std::io::ErrorKind::TimedOut =>
        {
            Ok(None)
        }
        Err(error) => Err(format!("failed to receive server query: {error}")),
    }
}

#[tauri::command]
pub async fn ping_server(server: DayzServer) -> Result<Option<u32>, String> {
    tauri::async_runtime::spawn_blocking(move || query_ping(&server))
        .await
        .map_err(|error| format!("server ping task failed: {error}"))?
}
