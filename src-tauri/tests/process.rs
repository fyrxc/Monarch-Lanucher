use monarch_launcher::process::{tasklist_contains_dayz, tasklist_contains_steam};

#[test]
fn detects_dayz_process_names_case_insensitively() {
    let output = "\"DayZ_x64.exe\",\"1944\",\"Console\"";
    assert!(tasklist_contains_dayz(output));
}

#[test]
fn detects_the_signed_in_steam_client_process() {
    let output = "\"steam.exe\",\"11320\",\"Console\"\n\"steamwebhelper.exe\",\"12000\",\"Console\"";
    assert!(tasklist_contains_steam(output));
    assert!(!tasklist_contains_steam("\"steamwebhelper.exe\",\"12000\",\"Console\""));
}
