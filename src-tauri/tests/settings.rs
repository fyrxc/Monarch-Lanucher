use monarch_launcher::models::LauncherSettings;
use monarch_launcher::settings::SettingsStore;
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

#[test]
fn settings_round_trip_all_launcher_options() {
    let root = temp_dir("settings-round-trip");
    let store = SettingsStore::new(root.clone());
    let expected = LauncherSettings {
        dayz_name: "Crash Out".to_string(),
        extra_launch_parameters: "-nosplash".to_string(),
        skip_battleye: true,
        ui_sounds: false,
    };

    store.save(&expected).expect("save settings");
    let actual = store.load().expect("load settings");

    assert_eq!(actual, expected);
    let _ = fs::remove_dir_all(root);
}

#[test]
fn old_settings_files_receive_new_defaults() {
    let root = temp_dir("settings-migration");
    fs::write(
        root.join("settings.json"),
        r#"{"dayzName":"LegacyName","extraLaunchParameters":"-nosplash"}"#,
    )
    .expect("write legacy settings");
    let store = SettingsStore::new(root.clone());

    let actual = store.load().expect("load legacy settings");

    assert_eq!(actual.dayz_name, "LegacyName");
    assert_eq!(actual.extra_launch_parameters, "-nosplash");
    assert!(!actual.skip_battleye);
    assert!(actual.ui_sounds);
    let _ = fs::remove_dir_all(root);
}

#[test]
fn missing_settings_file_returns_defaults() {
    let root = temp_dir("settings-defaults");
    let store = SettingsStore::new(root.clone());

    let actual = store.load().expect("missing settings should be safe");

    assert_eq!(actual, LauncherSettings::default());
    let _ = fs::remove_dir_all(root);
}
