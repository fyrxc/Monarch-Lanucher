use monarch_launcher::workshop::acquisition::{
    acquire_with_runner, build_download_args, managed_mod_path,
};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

fn temp_dir() -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock")
        .as_nanos();
    let path = std::env::temp_dir().join(format!(
        "monarch-workshop-acquisition-{}-{nonce}",
        std::process::id()
    ));
    fs::create_dir_all(&path).expect("create temp dir");
    path
}

#[test]
fn builds_anonymous_dayz_workshop_download_command() {
    let args = build_download_args("1559212036").expect("valid Workshop id");

    assert_eq!(
        args,
        vec![
            "+login",
            "anonymous",
            "+workshop_download_item",
            "221100",
            "1559212036",
            "validate",
            "+quit",
        ]
    );
}

#[test]
fn rejects_invalid_workshop_ids_before_starting_steamcmd() {
    assert!(build_download_args("").is_err());
    assert!(build_download_args("not-a-number").is_err());
    assert!(build_download_args("0").is_err());
}

#[test]
fn managed_mod_path_matches_steamcmd_workshop_layout() {
    let root = PathBuf::from(r"C:\Monarch\steamcmd");

    assert_eq!(
        managed_mod_path(&root, "1559212036"),
        root.join("steamapps")
            .join("workshop")
            .join("content")
            .join("221100")
            .join("1559212036")
    );
}

#[test]
fn acquisition_only_succeeds_after_downloaded_folder_exists() {
    let root = temp_dir();
    let workshop_id = "1559212036";

    let item = acquire_with_runner(&root, workshop_id, |args| {
        assert_eq!(args[0], "+login");
        assert_eq!(args[1], "anonymous");
        assert!(args.contains(&workshop_id.to_string()));

        let mod_path = managed_mod_path(&root, workshop_id);
        fs::create_dir_all(&mod_path).expect("create downloaded mod");
        fs::write(mod_path.join("meta.cpp"), "name = \"CF\";").expect("write metadata");
        Ok(())
    })
    .expect("downloaded mod should verify");

    assert_eq!(item.workshop_id, workshop_id);
    assert_eq!(item.name, "CF");
    assert_eq!(
        PathBuf::from(item.path),
        managed_mod_path(&root, workshop_id)
    );
    let _ = fs::remove_dir_all(root);
}

#[test]
fn acquisition_fails_when_runner_does_not_create_downloaded_folder() {
    let root = temp_dir();

    let error = acquire_with_runner(&root, "1559212036", |_| Ok(()))
        .expect_err("missing downloaded folder must fail");

    assert!(error.contains("1559212036"));
    let _ = fs::remove_dir_all(root);
}
