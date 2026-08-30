use monarch_launcher::steam_profile::parse_persona_name;

#[test]
fn chooses_most_recent_steam_persona_name() {
    let body = r#"
"users"
{
    "76561198000000001"
    {
        "PersonaName"    "Older Name"
        "MostRecent"     "0"
    }
    "76561198000000002"
    {
        "PersonaName"    "Public Steam Name"
        "MostRecent"     "1"
    }
}
"#;

    assert_eq!(
        parse_persona_name(body).as_deref(),
        Some("Public Steam Name")
    );
}

#[test]
fn falls_back_to_first_non_empty_persona() {
    let body = r#"
"users"
{
    "1" { "PersonaName" "Fallback Name" "MostRecent" "0" }
    "2" { "PersonaName" "" "MostRecent" "1" }
}
"#;

    assert_eq!(parse_persona_name(body).as_deref(), Some("Fallback Name"));
}
