use monarch_launcher::models::InstalledMod;
use monarch_launcher::workshop::sync::{build_sync_plan, verify_required_mods};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

fn installed(id: &str) -> InstalledMod {
    InstalledMod {
        workshop_id: id.to_string(),
        name: format!("Workshop {id}"),
        path: format!(r"C:\mods\{id}"),
    }
}

fn temp_dir() -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock")
        .as_nanos();
    let path = std::env::temp_dir().join(format!(
        "monarch-workshop-sync-{}-{nonce}",
        std::process::id()
    ));
    fs::create_dir_all(&path).expect("create temp dir");
    path
}

#[test]
fn sync_plan_splits_installed_and_missing_in_server_order() {
    let required = vec!["1".into(), "2".into(), "3".into()];
    let installed = vec![installed("2"), installed("1")];

    let plan = build_sync_plan(&required, &installed);

    assert_eq!(plan.required, required);
    assert_eq!(
        plan.installed
            .iter()
            .map(|item| item.workshop_id.as_str())
            .collect::<Vec<_>>(),
        vec!["1", "2"]
    );
    assert_eq!(plan.missing, vec!["3"]);
}

#[test]
fn verification_rejects_required_mod_when_local_folder_is_missing() {
    let root = temp_dir();
    let existing = root.join("1");
    fs::create_dir_all(&existing).expect("create installed mod folder");

    let installed = vec![
        InstalledMod {
            workshop_id: "1".into(),
            name: "One".into(),
            path: existing.to_string_lossy().into_owned(),
        },
        InstalledMod {
            workshop_id: "2".into(),
            name: "Two".into(),
            path: root.join("2").to_string_lossy().into_owned(),
        },
    ];
    let required = vec!["1".into(), "2".into()];

    let error = verify_required_mods(&required, &installed).expect_err("missing folder must fail");

    assert!(error.contains('2'));
    let _ = fs::remove_dir_all(root);
}
