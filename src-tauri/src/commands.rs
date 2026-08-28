use crate::collections::CollectionsStore;
use crate::launcher::build_launch_args;
use crate::models::{
    DayzServer, InstalledMod, LauncherSettings, ServerDirectoryResult, SystemStatus,
};
use crate::servers::ServerDirectory;
use crate::settings::SettingsStore;
use crate::steam::discover_steam;
use crate::workshop::discovery::discover_from_roots;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Arc;
use tauri::State;

pub struct LauncherState {
    server_directory: Arc<dyn ServerDirectory>,
    data_root: PathBuf,
}

impl LauncherState {
    pub fn new(server_directory: Arc<dyn ServerDirectory>, data_root: PathBuf) -> Self {
        Self {
            server_directory,
            data_root,
        }
    }

    fn settings(&self) -> SettingsStore {
        SettingsStore::new(self.data_root.clone())
    }

    fn collections(&self) -> CollectionsStore {
        CollectionsStore::new(self.data_root.clone())
    }
}

pub fn default_data_root() -> PathBuf {
    std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("Monarch Lanucher")
}

pub async fn get_servers_from(
    directory: &(dyn ServerDirectory + Send + Sync),
) -> Result<ServerDirectoryResult, String> {
    directory.fetch_servers().await
}

pub fn get_installed_mods_from(roots: &[PathBuf]) -> Result<Vec<InstalledMod>, String> {
    discover_from_roots(roots)
}

#[tauri::command]
pub async fn get_servers(state: State<'_, LauncherState>) -> Result<ServerDirectoryResult, String> {
    let directory = Arc::clone(&state.server_directory);
    get_servers_from(directory.as_ref()).await
}

#[tauri::command]
pub fn get_settings(state: State<'_, LauncherState>) -> Result<LauncherSettings, String> {
    state.settings().load()
}

#[tauri::command]
pub fn save_settings(
    state: State<'_, LauncherState>,
    settings: LauncherSettings,
) -> Result<(), String> {
    state.settings().save(&settings)
}

#[tauri::command]
pub fn get_favorites(state: State<'_, LauncherState>) -> Result<Vec<DayzServer>, String> {
    state.collections().favorites()
}

#[tauri::command]
pub fn toggle_favorite(
    state: State<'_, LauncherState>,
    server: DayzServer,
) -> Result<bool, String> {
    state.collections().toggle_favorite(&server)
}

#[tauri::command]
pub fn get_recent(state: State<'_, LauncherState>) -> Result<Vec<DayzServer>, String> {
    state.collections().recent()
}

#[tauri::command]
pub fn clear_recent(state: State<'_, LauncherState>) -> Result<(), String> {
    state.collections().clear_recent()
}

#[tauri::command]
pub fn get_system_status() -> SystemStatus {
    match discover_steam() {
        Ok(paths) => SystemStatus {
            steam_found: true,
            steam_path: Some(paths.steam_exe.to_string_lossy().into_owned()),
            dayz_found: paths.dayz_exe.is_some(),
            dayz_path: paths
                .dayz_exe
                .map(|path| path.to_string_lossy().into_owned()),
        },
        Err(_) => SystemStatus::default(),
    }
}

#[tauri::command]
pub fn get_installed_mods() -> Result<Vec<InstalledMod>, String> {
    let steam = discover_steam()?;
    get_installed_mods_from(&steam.library_roots)
}

#[tauri::command]
pub fn launch_server(state: State<'_, LauncherState>, server: DayzServer) -> Result<(), String> {
    let steam = discover_steam()?;
    if steam.dayz_exe.is_none() {
        return Err("DayZ is not installed".to_string());
    }

    let settings = state.settings().load()?;
    let args = build_launch_args(&server, &settings)?;

    Command::new(&steam.steam_exe)
        .args(&args)
        .spawn()
        .map_err(|error| format!("failed to launch DayZ through Steam: {error}"))?;

    state.collections().record_recent(&server)
}
