use monarch_launcher::launcher::{
    build_dayz_launch_command, build_dayz_launch_command_with_options,
    build_dayz_launch_command_with_password, build_launch_args, build_launch_args_with_mods,
};
use monarch_launcher::models::{DayzServer, InstalledMod, LauncherSettings};
use std::path::PathBuf;

fn server() -> DayzServer {
    DayzServer {
        id: "example".to_string(),
        name: "Example Server".to_string(),
        map: "chernarusplus".to_string(),
        players: 10,
        capacity: 100,
        ping: Some(42),
        ip: "1.2.3.4".to_string(),
        game_port: 2302,
        query_port: 2303,
        status: "online".to_string(),
        is_passworded: false,
        is_official: false,
        first_person_only: false,
        country: "US".to_string(),
        required_workshop_ids: Vec::new(),
    }
}

fn installed(workshop_id: &str, path: &str) -> InstalledMod {
    InstalledMod {
        workshop_id: workshop_id.to_string(),
        name: format!("Workshop {workshop_id}"),
        path: path.to_string(),
    }
}

#[test]
fn builds_separate_safe_steam_launch_arguments() {
    let settings = LauncherSettings {
        dayz_name: "Crash Out".to_string(),
        extra_launch_parameters: "-nosplash -skipIntro".to_string(),
        ..LauncherSettings::default()
    };

    let args = build_launch_args(&server(), &settings).expect("build launch args");

    assert_eq!(args[0], "-applaunch");
    assert_eq!(args[1], "221100");
    assert!(args.iter().any(|arg| arg == "-connect=1.2.3.4"));
    assert!(args.iter().any(|arg| arg == "-port=2302"));
    assert!(args.iter().any(|arg| arg == "-name=Crash Out"));
    assert!(args.iter().any(|arg| arg == "-nosplash"));
    assert!(args.iter().any(|arg| arg == "-skipIntro"));
}

#[test]
fn builds_official_battleye_bootstrap_command_without_legacy_prefix() {
    let root = PathBuf::from(r"C:\Steam\steamapps\common\DayZ");
    let command = build_dayz_launch_command(&server(), &LauncherSettings::default(), &[], &root)
        .expect("build BattlEye command");

    assert_eq!(command.executable, root.join("DayZ_BE.exe"));
    assert_eq!(command.working_directory, root);
    assert_eq!(&command.args[0..2], ["-exe", "DayZ_x64.exe"]);
    assert!(!command.args.iter().any(|arg| arg == "0"));
    assert!(command.args.iter().any(|arg| arg == "-connect=1.2.3.4"));
    assert!(command.args.iter().any(|arg| arg == "-port=2302"));
}

#[test]
fn skip_battleye_launches_dayz_x64_directly() {
    let root = PathBuf::from(r"C:\Steam\steamapps\common\DayZ");
    let command = build_dayz_launch_command_with_options(
        &server(),
        &LauncherSettings::default(),
        &[],
        &root,
        None,
        true,
    )
    .expect("build direct DayZ command");

    assert_eq!(command.executable, root.join("DayZ_x64.exe"));
    assert_eq!(command.working_directory, root);
    assert!(!command.args.iter().any(|arg| arg == "-exe"));
    assert!(command.args.iter().any(|arg| arg == "-connect=1.2.3.4"));
}

#[test]
fn password_is_added_as_one_dayz_launch_argument() {
    let root = PathBuf::from(r"C:\Steam\steamapps\common\DayZ");
    let command = build_dayz_launch_command_with_password(
        &server(),
        &LauncherSettings::default(),
        &[],
        &root,
        Some("secret pass"),
    )
    .expect("build passworded BattlEye command");

    assert!(command
        .args
        .iter()
        .any(|arg| arg == "-password=secret pass"));
}

#[test]
fn adds_verified_workshop_mod_paths_in_server_required_order() {
    let mut target = server();
    target.required_workshop_ids = vec!["20".into(), "10".into()];
    let settings = LauncherSettings::default();
    let installed = vec![
        installed("10", r"C:\mods\10"),
        installed("20", r"C:\mods\20"),
    ];

    let args = build_launch_args_with_mods(&target, &settings, &installed)
        .expect("build mod-aware launch args");

    assert!(args.iter().any(|arg| arg == r"-mod=C:\mods\20;C:\mods\10"));
}

#[test]
fn refuses_modded_launch_when_a_required_workshop_id_is_unavailable() {
    let mut target = server();
    target.required_workshop_ids = vec!["20".into()];

    let error = build_launch_args_with_mods(&target, &LauncherSettings::default(), &[])
        .expect_err("missing required mod must block launch");

    assert!(error.contains("20"));
}

#[test]
fn rejects_control_characters_in_extra_launch_parameters() {
    let settings = LauncherSettings {
        dayz_name: "Crash Out".to_string(),
        extra_launch_parameters: "-nosplash\n-deleteStuff".to_string(),
        ..LauncherSettings::default()
    };

    let error = build_launch_args(&server(), &settings).expect_err("reject newline");
    assert!(error.contains("invalid launch parameters"));
}
