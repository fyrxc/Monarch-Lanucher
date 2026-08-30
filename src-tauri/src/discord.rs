use serde_json::json;
use std::io::Write;
use std::sync::Mutex;

#[cfg(windows)]
use std::fs::{File, OpenOptions};

pub const DISCORD_APP_ID: &str = "1543377507770826762";
pub const DISCORD_TITLE: &str = "Monarch Launcher";
const DISCORD_LARGE_IMAGE_KEY: &str = "logo";

#[derive(Default)]
pub struct DiscordPresence {
    #[cfg(windows)]
    connection: Mutex<Option<File>>,
    #[cfg(not(windows))]
    connection: Mutex<Option<()>>,
}

impl DiscordPresence {
    pub fn set_activity(&self, view: &str) {
        #[cfg(windows)]
        {
            let mut guard = match self.connection.lock() {
                Ok(guard) => guard,
                Err(_) => return,
            };

            if guard.is_none() {
                *guard = connect().ok();
            }

            let Some(file) = guard.as_mut() else {
                return;
            };

            let payload = activity_payload(view);
            if write_frame(file, 1, payload.as_bytes()).is_err() {
                *guard = None;
            }
        }

        #[cfg(not(windows))]
        {
            let _ = view;
            let _ = &self.connection;
        }
    }
}

#[tauri::command]
pub fn set_discord_presence(
    presence: tauri::State<'_, DiscordPresence>,
    view: String,
) -> Result<(), String> {
    presence.set_activity(&view);
    Ok(())
}

fn activity_payload(view: &str) -> String {
    let state = match view {
        "Favorites" => "Viewing favorite servers",
        "Recent" => "Viewing recent servers",
        "Mods" => "Managing DayZ mods",
        "Settings" => "Launcher settings",
        _ => "Browsing DayZ servers",
    };

    json!({
        "cmd": "SET_ACTIVITY",
        "args": {
            "pid": std::process::id(),
            "activity": {
                "details": DISCORD_TITLE,
                "state": state,
                "assets": {
                    "large_image": DISCORD_LARGE_IMAGE_KEY,
                    "large_text": DISCORD_TITLE
                }
            }
        },
        "nonce": format!("monarch-{}", std::process::id())
    })
    .to_string()
}

fn handshake_payload() -> String {
    json!({
        "v": 1,
        "client_id": DISCORD_APP_ID
    })
    .to_string()
}

fn encode_frame(opcode: u32, payload: &[u8]) -> Vec<u8> {
    let mut frame = Vec::with_capacity(8 + payload.len());
    frame.extend_from_slice(&opcode.to_le_bytes());
    frame.extend_from_slice(&(payload.len() as u32).to_le_bytes());
    frame.extend_from_slice(payload);
    frame
}

fn write_frame<W: Write>(writer: &mut W, opcode: u32, payload: &[u8]) -> std::io::Result<()> {
    writer.write_all(&encode_frame(opcode, payload))?;
    writer.flush()
}

#[cfg(windows)]
fn connect() -> Result<File, String> {
    for index in 0..10 {
        let path = format!(r"\\?\pipe\discord-ipc-{index}");
        if let Ok(mut file) = OpenOptions::new().read(true).write(true).open(&path) {
            let handshake = handshake_payload();
            write_frame(&mut file, 0, handshake.as_bytes())
                .map_err(|error| format!("failed Discord IPC handshake: {error}"))?;
            return Ok(file);
        }
    }

    Err("Discord IPC is not available".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn handshake_uses_monarch_discord_application() {
        let payload = handshake_payload();
        assert!(payload.contains(DISCORD_APP_ID));
    }

    #[test]
    fn activity_uses_monarch_title() {
        let payload = activity_payload("Servers");
        assert!(payload.contains(DISCORD_TITLE));
        assert!(payload.contains("Browsing DayZ servers"));
    }

    #[test]
    fn discord_frame_uses_little_endian_header() {
        let frame = encode_frame(1, b"abc");
        assert_eq!(&frame[0..4], &1u32.to_le_bytes());
        assert_eq!(&frame[4..8], &3u32.to_le_bytes());
        assert_eq!(&frame[8..], b"abc");
    }
}
