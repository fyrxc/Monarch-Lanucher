use monarch_launcher::launcher::build_launch_args;
use monarch_launcher::models::{DayzServer, LauncherSettings};

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

#[test]
fn builds_separate_safe_steam_launch_arguments() {
    let settings = LauncherSettings {
        dayz_name: "Crash Out".to_string(),
        extra_launch_parameters: "-nosplash -skipIntro".to_string(),
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
fn rejects_control_characters_in_extra_launch_parameters() {
    let settings = LauncherSettings {
        dayz_name: "Crash Out".to_string(),
        extra_launch_parameters: "-nosplash\n-deleteStuff".to_string(),
    };

    let error = build_launch_args(&server(), &settings).expect_err("reject newline");
    assert!(error.contains("invalid launch parameters"));
}
