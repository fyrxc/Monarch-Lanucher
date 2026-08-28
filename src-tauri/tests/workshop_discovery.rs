use monarch_launcher::workshop::discovery::discover_from_roots;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

fn temp_dir() -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock")
        .as_nanos();
    let path = std::env::temp_dir().join(format!(
        "monarch-workshop-discovery-{}-{nonce}",
        std::process::id()
    ));
    fs::create_dir_all(&path).expect("create temp dir");
    path
}

#[test]
fn finds_mods_across_multiple_steam_libraries() {
    let root = temp_dir();
    let a = root.join("A/steamapps/workshop/content/221100/1559212036");
    let b = root.join("B/steamapps/workshop/content/221100/1828439124");
    fs::create_dir_all(&a).expect("create first workshop mod");
    fs::create_dir_all(&b).expect("create second workshop mod");
    fs::write(a.join("meta.cpp"), "name = \"CF\";").expect("write first metadata");
    fs::write(b.join("mod.cpp"), "name=\"VPP Admin Tools\";").expect("write second metadata");

    let mods = discover_from_roots(&[root.join("A"), root.join("B")]).expect("discover mods");

    assert_eq!(mods.len(), 2);
    assert_eq!(mods[0].workshop_id, "1559212036");
    assert_eq!(mods[0].name, "CF");
    assert_eq!(mods[1].workshop_id, "1828439124");
    assert_eq!(mods[1].name, "VPP Admin Tools");
    let _ = fs::remove_dir_all(root);
}

#[test]
fn skips_non_numeric_folders_and_falls_back_when_metadata_is_missing() {
    let root = temp_dir();
    let workshop = root.join("steamapps/workshop/content/221100");
    fs::create_dir_all(workshop.join("not-a-mod")).expect("create malformed folder");
    fs::create_dir_all(workshop.join("123456789")).expect("create numeric mod");

    let mods = discover_from_roots(std::slice::from_ref(&root)).expect("discover mods");

    assert_eq!(mods.len(), 1);
    assert_eq!(mods[0].workshop_id, "123456789");
    assert_eq!(mods[0].name, "Workshop 123456789");
    let _ = fs::remove_dir_all(root);
}
