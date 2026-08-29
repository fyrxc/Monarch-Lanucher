use monarch_launcher::commands::{get_installed_mods_from, merge_workshop_ids};
use monarch_launcher::models::InstalledMod;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

fn temp_dir() -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock")
        .as_nanos();
    let path = std::env::temp_dir().join(format!(
        "monarch-installed-mod-command-{}-{nonce}",
        std::process::id()
    ));
    fs::create_dir_all(&path).expect("create temp dir");
    path
}

#[test]
fn installed_mod_command_helper_scans_supplied_steam_roots() {
    let root = temp_dir();
    let mod_path = root.join("steamapps/workshop/content/221100/1559212036");
    fs::create_dir_all(&mod_path).expect("create workshop mod");
    fs::write(mod_path.join("meta.cpp"), "name = \"CF\";").expect("write metadata");

    let mods = get_installed_mods_from(std::slice::from_ref(&root)).expect("scan mods");

    assert_eq!(mods.len(), 1);
    assert_eq!(mods[0].workshop_id, "1559212036");
    let _ = fs::remove_dir_all(root);
}

#[test]
fn workshop_catalog_keeps_local_order_and_adds_pending_subscriptions_once() {
    let local = vec![InstalledMod {
        workshop_id: "111".to_string(),
        name: "Installed".to_string(),
        path: "C:/Workshop/111".to_string(),
    }];
    let subscribed = vec!["111".to_string(), "222".to_string(), "333".to_string()];

    assert_eq!(
        merge_workshop_ids(&local, &subscribed),
        vec!["111".to_string(), "222".to_string(), "333".to_string()]
    );
}
