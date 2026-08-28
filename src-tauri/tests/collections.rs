use monarch_launcher::collections::CollectionsStore;
use monarch_launcher::models::DayzServer;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

fn temp_dir(label: &str) -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock")
        .as_nanos();
    let path = std::env::temp_dir().join(format!(
        "monarch-launcher-{label}-{}-{nonce}",
        std::process::id()
    ));
    fs::create_dir_all(&path).expect("create temp dir");
    path
}

fn server(index: u32) -> DayzServer {
    DayzServer {
        id: format!("server-{index}"),
        name: format!("Server {index}"),
        map: "chernarusplus".to_string(),
        players: index,
        capacity: 100,
        ping: Some(40),
        ip: format!("10.0.0.{index}"),
        game_port: 2302,
        query_port: 2303,
        status: "online".to_string(),
        is_passworded: false,
        is_official: false,
        first_person_only: false,
        country: "US".to_string(),
        required_workshop_ids: Vec::new(),
    }
}

#[test]
fn favorite_toggle_adds_then_removes_server() {
    let root = temp_dir("favorites-toggle");
    let store = CollectionsStore::new(root.clone());
    let target = server(1);

    let added = store.toggle_favorite(&target).expect("add favorite");
    assert!(added);
    assert_eq!(store.favorites().expect("load favorites"), vec![target.clone()]);

    let added = store.toggle_favorite(&target).expect("remove favorite");
    assert!(!added);
    assert!(store.favorites().expect("load favorites").is_empty());
    let _ = fs::remove_dir_all(root);
}

#[test]
fn recent_is_unique_newest_first_and_capped_at_twenty() {
    let root = temp_dir("recent-history");
    let store = CollectionsStore::new(root.clone());

    for index in 1..=21 {
        store.record_recent(&server(index)).expect("record recent");
    }
    store.record_recent(&server(10)).expect("move existing recent");

    let recent = store.recent().expect("load recent");
    assert_eq!(recent.len(), 20);
    assert_eq!(recent[0].id, "server-10");
    assert_eq!(recent.iter().filter(|item| item.id == "server-10").count(), 1);
    assert!(!recent.iter().any(|item| item.id == "server-1"));
    let _ = fs::remove_dir_all(root);
}

#[test]
fn empty_provider_id_falls_back_to_address_identity() {
    let root = temp_dir("fallback-identity");
    let store = CollectionsStore::new(root.clone());
    let mut first = server(2);
    first.id.clear();
    first.ip = "1.2.3.4".to_string();
    first.game_port = 2302;

    let mut updated = first.clone();
    updated.name = "Renamed Server".to_string();

    store.toggle_favorite(&first).expect("add favorite");
    let added = store.toggle_favorite(&updated).expect("remove same identity");

    assert!(!added);
    assert!(store.favorites().expect("load favorites").is_empty());
    let _ = fs::remove_dir_all(root);
}
