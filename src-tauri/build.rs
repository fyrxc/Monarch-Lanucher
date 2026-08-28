use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use std::fs;
use std::path::Path;

fn main() {
    let icon_path = Path::new("icons/icon.ico");
    if !icon_path.exists() {
        fs::create_dir_all("icons").expect("failed to create Tauri icon directory");
        let encoded =
            fs::read_to_string("icons/icon.ico.b64").expect("failed to read embedded Monarch icon");
        let bytes = STANDARD
            .decode(encoded.trim())
            .expect("failed to decode embedded Monarch icon");
        fs::write(icon_path, bytes).expect("failed to write Tauri Windows icon");
    }

    tauri_build::build()
}
