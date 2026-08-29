use serde_json::json;

fn configured_app_id() -> Option<&'static str> {
    option_env!("MONARCH_DISCORD_APP_ID")
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn activity_payload(state: Option<&str>, context: Option<&str>) -> serde_json::Value {
    if state.is_none() && context.is_none() {
        return serde_json::Value::Null;
    }

    let state = state.unwrap_or("Browsing servers").trim();
    let context = context.unwrap_or("").trim();
    let display_state = if context.is_empty() || context.eq_ignore_ascii_case("Monarch Launcher") {
        state.to_string()
    } else {
        format!("{state} • {context}")
    };

    json!({
        "details": "Monarch Launcher",
        "state": display_state,
        "assets": {
            "large_image": "monarch_m",
            "large_text": "Monarch Launcher"
        }
    })
}

#[cfg(windows)]
fn send_presence(state: Option<&str>, details: Option<&str>) -> Result<bool, String> {
    use std::fs::{File, OpenOptions};
    use std::io::Write;
    use std::process;
    use std::time::{SystemTime, UNIX_EPOCH};

    let Some(client_id) = configured_app_id() else {
        return Ok(false);
    };

    fn frame(file: &mut File, opcode: u32, value: serde_json::Value) -> Result<(), String> {
        let payload = serde_json::to_vec(&value)
            .map_err(|error| format!("failed to serialize Discord presence: {error}"))?;
        file.write_all(&opcode.to_le_bytes())
            .and_then(|_| file.write_all(&(payload.len() as u32).to_le_bytes()))
            .and_then(|_| file.write_all(&payload))
            .and_then(|_| file.flush())
            .map_err(|error| format!("failed to write Discord IPC: {error}"))
    }

    let mut pipe = (0..10)
        .find_map(|index| {
            OpenOptions::new()
                .read(true)
                .write(true)
                .open(format!(r"\\?\pipe\discord-ipc-{index}"))
                .ok()
        })
        .ok_or_else(|| "Discord is not running or its IPC pipe is unavailable.".to_string())?;

    frame(&mut pipe, 0, json!({ "v": 1, "client_id": client_id }))?;

    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos()
        .to_string();
    let activity = activity_payload(state, details);
    frame(
        &mut pipe,
        1,
        json!({
            "cmd": "SET_ACTIVITY",
            "args": { "pid": process::id(), "activity": activity },
            "nonce": nonce,
        }),
    )?;
    Ok(true)
}

#[cfg(not(windows))]
fn send_presence(_state: Option<&str>, _details: Option<&str>) -> Result<bool, String> {
    Ok(false)
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
        assert_eq!(activity["details"], "Monarch Launcher");
        assert_eq!(activity["state"], "Browsing servers");
        assert_eq!(activity["assets"]["large_image"], "monarch_m");
        assert_eq!(activity["assets"]["large_text"], "Monarch Launcher");
    }

    #[test]
    fn presence_keeps_server_context_below_launcher_title() {
        let activity = activity_payload(Some("Playing DayZ"), Some("Crashout PVP"));
        assert_eq!(activity["details"], "Monarch Launcher");
        assert_eq!(activity["state"], "Playing DayZ • Crashout PVP");
    }
}
