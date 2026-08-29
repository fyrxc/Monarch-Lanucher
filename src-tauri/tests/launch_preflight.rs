use monarch_launcher::models::{InstalledMod, ServerLaunchPreflight};
use monarch_launcher::workshop::sync::build_launch_preflight;

fn installed(workshop_id: &str) -> InstalledMod {
    InstalledMod {
        workshop_id: workshop_id.to_string(),
        name: format!("Workshop {workshop_id}"),
        path: format!(r"C:\\Steam\\steamapps\\workshop\\content\\221100\\{workshop_id}"),
    }
}

#[test]
fn reports_only_missing_required_mods_before_launch() {
    let required = vec!["111".to_string(), "222".to_string(), "333".to_string()];
    let installed = vec![installed("111"), installed("333")];

    let preflight = build_launch_preflight(&required, &installed, false);

    assert_eq!(
        preflight,
        ServerLaunchPreflight {
            ready: false,
            missing_workshop_ids: vec!["222".to_string()],
            dayz_running: false,
        }
    );
}

#[test]
fn is_ready_only_when_mods_are_present_and_dayz_is_not_running() {
    let required = vec!["111".to_string()];
    let installed = vec![installed("111")];

    assert_eq!(
        build_launch_preflight(&required, &installed, false),
        ServerLaunchPreflight {
            ready: true,
            missing_workshop_ids: Vec::new(),
            dayz_running: false,
        }
    );

    assert_eq!(
        build_launch_preflight(&required, &installed, true),
        ServerLaunchPreflight {
            ready: false,
            missing_workshop_ids: Vec::new(),
            dayz_running: true,
        }
    );
}
