use monarch_launcher::steam::parse_libraryfolders;

#[test]
fn parses_default_and_additional_steam_library_roots() {
    let body = r#"
"libraryfolders"
{
    "0"
    {
        "path"      "C:\\Program Files (x86)\\Steam"
    }
    "1"
    {
        "path"      "D:\\SteamLibrary"
    }
    "2"
    {
        "path"      "D:\\SteamLibrary"
    }
}
"#;

    let roots = parse_libraryfolders(body).expect("parse library folders");

    assert_eq!(roots.len(), 2);
    assert!(roots.iter().any(|path| path.to_string_lossy().contains("Program Files (x86)")));
    assert!(roots.iter().any(|path| path.to_string_lossy().contains("D:\\SteamLibrary")));
}
