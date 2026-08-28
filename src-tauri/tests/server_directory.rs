use monarch_launcher::servers::parse_directory_json;

#[test]
fn maps_dzsa_rows_and_preserves_required_workshop_ids() {
    let json = r#"
    {
      "status": 0,
      "result": [
        {
          "name": "Monarch Test | 1PP",
          "players": 42,
          "maxPlayers": 100,
          "map": "chernarusplus",
          "password": false,
          "official": false,
          "firstPersonOnly": true,
          "country": "US",
          "mods": [
            { "name": "CF", "steamWorkshopId": 1559212036 },
            { "name": "VPPAdminTools", "steamWorkshopId": "1828439124" }
          ],
          "endpoint": { "ip": "1.2.3.4", "port": 2303 },
          "gamePort": 2302
        }
      ]
    }
    "#;

    let servers = parse_directory_json(json).expect("parse directory");
    let server = servers.first().expect("one server");

    assert_eq!(servers.len(), 1);
    assert_eq!(server.name, "Monarch Test | 1PP");
    assert_eq!(server.map, "chernarusplus");
    assert_eq!(server.players, 42);
    assert_eq!(server.capacity, 100);
    assert_eq!(server.ip, "1.2.3.4");
    assert_eq!(server.game_port, 2302);
    assert_eq!(server.query_port, 2303);
    assert!(server.first_person_only);
    assert_eq!(server.country, "US");
    assert_eq!(
        server.required_workshop_ids,
        vec!["1559212036".to_string(), "1828439124".to_string()]
    );
}

#[test]
fn skips_malformed_rows_deduplicates_and_sorts_populated_servers_first() {
    let json = r#"
    {
      "status": 0,
      "result": [
        { "name": "Broken" },
        {
          "id": "same",
          "name": "Low",
          "players": 2,
          "maxPlayers": 60,
          "map": "enoch",
          "mods": [],
          "endpoint": { "ip": "5.6.7.8", "port": 2403 },
          "gamePort": 2402
        },
        {
          "id": "same",
          "name": "Duplicate",
          "players": 20,
          "maxPlayers": 60,
          "map": "enoch",
          "mods": [],
          "endpoint": { "ip": "5.6.7.8", "port": 2403 },
          "gamePort": 2402
        },
        {
          "name": "High",
          "players": 50,
          "maxPlayers": 100,
          "map": "chernarusplus",
          "mods": [],
          "endpoint": { "ip": "9.8.7.6", "port": 2503 },
          "gamePort": 2502
        }
      ]
    }
    "#;

    let servers = parse_directory_json(json).expect("parse directory");

    assert_eq!(servers.len(), 2);
    assert_eq!(servers[0].name, "High");
    assert_eq!(servers[1].name, "Low");
}

#[test]
fn rejects_nonzero_provider_status() {
    let error = parse_directory_json(r#"{"status": 12, "result": []}"#)
        .expect_err("provider failure should be returned");
    assert!(error.contains("status 12"));
}
