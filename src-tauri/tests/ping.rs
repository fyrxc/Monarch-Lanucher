use monarch_launcher::models::DayzServer;
use monarch_launcher::ping::query_ping_with_timeout;
use std::net::UdpSocket;
use std::thread;
use std::time::Duration;

fn server(query_port: u16) -> DayzServer {
    DayzServer {
        id: "local-ping".to_string(),
        name: "Local Ping".to_string(),
        map: "chernarusplus".to_string(),
        players: 1,
        capacity: 60,
        ping: None,
        ip: "127.0.0.1".to_string(),
        game_port: query_port.saturating_sub(1),
        query_port,
        status: "online".to_string(),
        is_passworded: false,
        is_official: false,
        first_person_only: false,
        country: "US".to_string(),
        required_workshop_ids: Vec::new(),
    }
}

#[test]
fn measures_latency_from_an_a2s_style_udp_response() {
    let responder = UdpSocket::bind("127.0.0.1:0").expect("bind local UDP responder");
    let port = responder.local_addr().expect("local address").port();
    let worker = thread::spawn(move || {
        let mut buffer = [0u8; 256];
        let (_, source) = responder.recv_from(&mut buffer).expect("receive query");
        responder
            .send_to(&[0xFF, 0xFF, 0xFF, 0xFF, b'I'], source)
            .expect("send query response");
    });

    let ping = query_ping_with_timeout(&server(port), Duration::from_secs(1))
        .expect("query succeeds")
        .expect("ping is measured");

    assert!(ping < 1000);
    worker.join().expect("responder exits");
}

#[test]
fn returns_none_when_the_query_times_out() {
    let socket = UdpSocket::bind("127.0.0.1:0").expect("reserve local UDP port");
    let port = socket.local_addr().expect("local address").port();
    drop(socket);

    let ping = query_ping_with_timeout(&server(port), Duration::from_millis(30))
        .expect("timeout is not a launcher error");

    assert_eq!(ping, None);
}
