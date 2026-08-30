use monarch_launcher::models::{DayzServer, LauncherSettings};

#[test]
fn dayz_server_serializes_frontend_contract_in_camel_case() {
    let server = DayzServer {
        id: "monarch-1".into(),
        name: "Monarch EU".into(),
        map: "chernarusplus".into(),
        players: 42,
        capacity: 100,
        ping: Some(45),
        ip: "1.2.3.4".into(),
        game_port: 2302,
        query_port: 2303,
        status: "online".into(),
        is_passworded: false,
        is_official: false,
        first_person_only: true,
        country: "US".into(),
        required_workshop_ids: vec!["1559212036".into()],
    };

    let value = serde_json::to_value(server).expect("serialize server");
    assert_eq!(value["gamePort"], 2302);
    assert_eq!(value["queryPort"], 2303);
    assert_eq!(value["requiredWorkshopIds"][0], "1559212036");
    assert_eq!(value["firstPersonOnly"], true);
}

#[test]
fn launcher_settings_default_to_safe_values() {
    let settings = LauncherSettings::default();
    assert_eq!(settings.dayz_name, "");
    assert_eq!(settings.extra_launch_parameters, "");
    assert!(!settings.skip_battleye);
    assert!(settings.ui_sounds);
}
