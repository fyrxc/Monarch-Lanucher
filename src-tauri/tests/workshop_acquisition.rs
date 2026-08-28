use monarch_launcher::workshop::acquisition::{build_download_args, managed_mod_path};
use std::path::PathBuf;

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
