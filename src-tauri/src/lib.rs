pub mod collections;
pub mod commands;
pub mod launcher;
pub mod models;
pub mod servers;
pub mod settings;
pub mod steam;
pub mod workshop;

use commands::{default_data_root, LauncherState};
use servers::DzsaServerDirectory;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let server_directory =
        DzsaServerDirectory::new().expect("failed to initialize server directory");

    tauri::Builder::default()
        .manage(LauncherState::new(
            Arc::new(server_directory),
            default_data_root(),
        ))
        .invoke_handler(tauri::generate_handler![
            commands::get_servers,
            commands::get_settings,
            commands::save_settings,
            commands::get_favorites,
            commands::toggle_favorite,
            commands::get_recent,
            commands::clear_recent,
            commands::get_system_status,
            commands::get_installed_mods,
            commands::launch_server,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Monarch Lanucher");
}
