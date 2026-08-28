pub mod collections;
pub mod commands;
pub mod launcher;
pub mod models;
pub mod servers;
pub mod settings;
pub mod steam;

use commands::LauncherState;
use servers::DzsaServerDirectory;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let server_directory =
        DzsaServerDirectory::new().expect("failed to initialize server directory");

    tauri::Builder::default()
        .manage(LauncherState::new(Arc::new(server_directory)))
        .invoke_handler(tauri::generate_handler![commands::get_servers])
        .run(tauri::generate_context!())
        .expect("error while running Monarch Lanucher");
}
