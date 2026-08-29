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
fn settings_round_trip_dayz_name_and_launch_parameters() {
    let root = temp_dir("settings-round-trip");
    let store = SettingsStore::new(root.clone());
    let expected = LauncherSettings {
        dayz_name: "Crash Out".to_string(),
        extra_launch_parameters: "-nosplash".to_string(),
        ..LauncherSettings::default()
    };

    store.save(&expected).expect("save settings");
    let actual = store.load().expect("load settings");

    assert_eq!(actual, expected);
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
