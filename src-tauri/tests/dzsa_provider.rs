use monarch_launcher::servers::{DzsaServerDirectory, ServerDirectory};
use std::io::{Read, Write};
use std::net::TcpListener;
use std::thread;

fn serve_once(status: &str, body: &str) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind test server");
    let address = listener.local_addr().expect("local address");
    let status = status.to_string();
    let body = body.to_string();

    thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("accept request");
        let mut request = [0u8; 4096];
        let _ = stream.read(&mut request);
        let response = format!(
            "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        );
        stream
            .write_all(response.as_bytes())
            .expect("write response");
    });

    format!("http://{address}")
}

#[tokio::test]
async fn dzsa_provider_fetches_and_normalizes_directory() {
    let endpoint = serve_once(
        "200 OK",
        r#"{
          "status": 0,
          "result": [{
            "name": "Provider Test",
            "players": 12,
            "maxPlayers": 80,
            "map": "chernarusplus",
            "firstPersonOnly": false,
            "password": false,
            "mods": [{"steamWorkshopId": 1559212036}],
            "endpoint": {"ip": "127.0.0.1", "port": 2303},
            "gamePort": 2302
          }]
        }"#,
    );
    let provider = DzsaServerDirectory::with_endpoint(endpoint).expect("provider");

    let result = provider.fetch_servers().await.expect("fetch directory");

    assert_eq!(result.servers.len(), 1);
    assert_eq!(result.servers[0].name, "Provider Test");
    assert_eq!(result.servers[0].required_workshop_ids, vec!["1559212036"]);
}

#[tokio::test]
async fn dzsa_provider_rejects_non_success_http_status() {
    let endpoint = serve_once("503 Service Unavailable", "service unavailable");
    let provider = DzsaServerDirectory::with_endpoint(endpoint).expect("provider");

    let error = provider.fetch_servers().await.expect_err("503 should fail");

    assert!(error.to_string().contains("503"));
}
