pub mod collections;
pub mod commands;
pub mod launcher;
pub mod models;
pub mod ping;
pub mod process;
pub mod server_mods;
pub mod servers;
pub mod settings;
pub mod steam;
pub mod steam_profile;
pub mod updates;
pub mod workshop;

use commands::{default_data_root, LauncherState};
use servers::DzsaServerDirectory;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let server_directory =
        DzsaServerDirectory::new().expect("failed to initialize server directory");

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            commands::update_workshop_mod,
            commands::unsubscribe_workshop_mod,
            commands::open_mod_folder,
            commands::prepare_server_launch,
            commands::setup_server_mods,
            commands::get_workshop_download_progress,
            commands::close_dayz,
            commands::launch_server,
            ping::ping_server,
            process::get_dayz_running,
            server_mods::get_server_mod_details,
            updates::check_for_update,
            updates::install_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Monarch Launcher");
}
