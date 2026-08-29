use monarch_launcher::steam::{find_dayz_install, parse_libraryfolders};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[test]
fn parses_default_and_additional_steam_library_roots() {
    let body = r#"
"libraryfolders"
{
    "0"
    {
        "path"      "C:\\Program Files (x86)\\Steam"
    }
    "1"
    {
        "path"      "D:\\SteamLibrary"
    }
    "2"
    {
        "path"      "D:\\SteamLibrary"
    }
}
"#;

    let roots = parse_libraryfolders(body).expect("parse library folders");

    assert_eq!(roots.len(), 2);
    assert!(roots
        .iter()
        .any(|path| path.to_string_lossy().contains("Program Files (x86)")));
    assert!(roots
        .iter()
        .any(|path| path.to_string_lossy().contains("D:\\SteamLibrary")));
}

#[test]
fn discovers_dayz_and_battleye_from_a_steam_library() {
    let suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock")
        .as_nanos();
    let root = std::env::temp_dir().join(format!("monarch-steam-test-{suffix}"));
    let dayz_root = root.join("steamapps").join("common").join("DayZ");
    fs::create_dir_all(&dayz_root).expect("create DayZ test directory");
    fs::write(dayz_root.join("DayZ_x64.exe"), b"").expect("create DayZ exe");
    fs::write(dayz_root.join("DayZ_BE.exe"), b"").expect("create BattlEye exe");

    let (detected_root, dayz_exe, battleye_exe) = find_dayz_install(&[PathBuf::from(&root)]);

    assert_eq!(detected_root.as_deref(), Some(dayz_root.as_path()));
    assert_eq!(
        dayz_exe.as_deref(),
        Some(dayz_root.join("DayZ_x64.exe").as_path())
    );
    assert_eq!(
        battleye_exe.as_deref(),
        Some(dayz_root.join("DayZ_BE.exe").as_path())
    );

    fs::remove_dir_all(root).expect("remove Steam test directory");
}
