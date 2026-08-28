use monarch_launcher::models::InstalledMod;
use monarch_launcher::workshop::sync::build_sync_plan;

fn installed(id: &str) -> InstalledMod {
    InstalledMod {
        workshop_id: id.to_string(),
        name: format!("Workshop {id}"),
        path: format!(r"C:\mods\{id}"),
    }
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
