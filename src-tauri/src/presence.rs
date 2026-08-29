use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
#[cfg(test)]
use serde_json::json;

fn configured_app_id() -> Option<&'static str> {
    option_env!("MONARCH_DISCORD_APP_ID")
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn display_state(state: Option<&str>, context: Option<&str>) -> Option<String> {
    if state.is_none() && context.is_none() {
        return None;
    }

    let state = state.unwrap_or("Browsing servers").trim();
    let context = context.unwrap_or("").trim();
    Some(
        if context.is_empty() || context.eq_ignore_ascii_case("Monarch Launcher") {
            state.to_string()
        } else {
            format!("{state} • {context}")
        },
    )
}

#[cfg(test)]
fn activity_payload(state: Option<&str>, context: Option<&str>) -> serde_json::Value {
    let Some(display_state) = display_state(state, context) else {
        return serde_json::Value::Null;
    };

    json!({
        "name": "Monarch Launcher",
        "details": "Monarch Launcher",
        "state": display_state,
        "assets": {
            "large_image": "monarch_m",
            "large_text": "Monarch Launcher"
        }
    })
}

fn send_presence(state: Option<&str>, context: Option<&str>) -> Result<bool, String> {
    let Some(client_id) = configured_app_id() else {
        return Ok(false);
    };

    let mut client = DiscordIpcClient::new(client_id);
    client
        .connect()
        .map_err(|error| format!("failed to connect Discord Rich Presence: {error}"))?;

    let result = match display_state(state, context) {
        Some(display_state) => client.set_activity(
            activity::Activity::new()
                .name("Monarch Launcher")
                .details("Monarch Launcher")
                .state(display_state)
                .assets(
                    activity::Assets::new()
                        .large_image("monarch_m")
                        .large_text("Monarch Launcher"),
                ),
        ),
        None => client.clear_activity(),
    }
    .map_err(|error| format!("failed to update Discord Rich Presence: {error}"));

    let _ = client.close();
    result.map(|_| true)
}

#[tauri::command]
pub async fn set_discord_presence(state: String, details: Option<String>) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        send_presence(Some(state.trim()), details.as_deref().map(str::trim))
    })
    .await
    .map_err(|error| format!("Discord presence task failed: {error}"))?
}

#[tauri::command]
pub async fn clear_discord_presence() -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || send_presence(None, None))
        .await
        .map_err(|error| format!("Discord presence task failed: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn presence_activity_uses_monarch_m_branding() {
        let activity = activity_payload(Some("Browsing servers"), Some("Monarch Launcher"));
        assert_eq!(activity["name"], "Monarch Launcher");
        assert_eq!(activity["details"], "Monarch Launcher");
        assert_eq!(activity["state"], "Browsing servers");
        assert_eq!(activity["assets"]["large_image"], "monarch_m");
        assert_eq!(activity["assets"]["large_text"], "Monarch Launcher");
    }

    #[test]
    fn presence_keeps_server_context_below_launcher_title() {
        let activity = activity_payload(Some("Playing DayZ"), Some("Crashout PVP"));
        assert_eq!(activity["name"], "Monarch Launcher");
        assert_eq!(activity["details"], "Monarch Launcher");
        assert_eq!(activity["state"], "Playing DayZ • Crashout PVP");
    }

    #[test]
    fn clearing_presence_builds_no_activity() {
        assert_eq!(activity_payload(None, None), serde_json::Value::Null);
    }
}
