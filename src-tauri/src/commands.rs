use crate::collections::CollectionsStore;
use crate::launcher::build_dayz_launch_command;
use crate::models::{
    DayzServer, InstalledMod, LauncherSettings, ServerDirectoryResult, SystemStatus,
    WorkshopDownloadStatus, WorkshopMod,
};
use crate::servers::ServerDirectory;
use crate::settings::SettingsStore;
use crate::steam::discover_steam;
use crate::steam_profile::{detect_persona_name, resolve_player_name};
use crate::workshop::discovery::discover_from_roots;
use crate::workshop::metadata::fetch_published_file_details;
use crate::workshop::steamworks_ugc::{parse_workshop_id, SteamWorkshopService};
use crate::workshop::sync::verify_required_mods;
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
        Ok(paths) => {
            let steam_persona_name = paths.steam_exe.parent().and_then(detect_persona_name);

            SystemStatus {
                steam_found: true,
                steam_path: Some(paths.steam_exe.to_string_lossy().into_owned()),
                steam_persona_name,
                dayz_found: paths.dayz_exe.is_some(),
                dayz_path: paths
                    .dayz_exe
                    .map(|path| path.to_string_lossy().into_owned()),
            }
        }
        Err(_) => SystemStatus::default(),
    }
}

#[tauri::command]
pub async fn get_installed_mods() -> Result<Vec<WorkshopMod>, String> {
    let steam = discover_steam()?;
    let local_mods = get_installed_mods_from(&steam.library_roots)?;
    let workshop_ids = local_mods
        .iter()
        .map(|item| item.workshop_id.clone())
        .collect::<Vec<_>>();

    let metadata = fetch_published_file_details(&reqwest::Client::new(), &workshop_ids)
        .await
        .unwrap_or_default();
    let steamworks = SteamWorkshopService::initialize().ok();

    Ok(local_mods
        .into_iter()
        .map(|item| {
            let details = metadata.get(&item.workshop_id);
            let status = steamworks
                .as_ref()
                .and_then(|service| service.status(&item.workshop_id).ok())
                .unwrap_or_default();

            WorkshopMod {
                workshop_id: item.workshop_id,
                name: details
                    .map(|value| value.title.clone())
                    .unwrap_or(item.name),
                path: item.path,
                preview_url: details.and_then(|value| value.preview_url.clone()),
                needs_update: status.needs_update,
                is_downloading: status.is_downloading,
                is_subscribed: status.is_subscribed,
            }
        })
        .collect())
}

#[tauri::command]
pub fn install_workshop_mod(workshop_id: String) -> Result<(), String> {
    SteamWorkshopService::initialize()?.subscribe_and_download(&workshop_id)
}

#[tauri::command]
pub fn get_workshop_download_status(
    workshop_id: String,
) -> Result<WorkshopDownloadStatus, String> {
    SteamWorkshopService::initialize()?.download_status(&workshop_id)
}

#[tauri::command]
pub fn update_workshop_mod(workshop_id: String) -> Result<(), String> {
    SteamWorkshopService::initialize()?.request_update(&workshop_id)
}

#[tauri::command]
pub fn unsubscribe_workshop_mod(workshop_id: String) -> Result<(), String> {
    SteamWorkshopService::initialize()?.unsubscribe(&workshop_id)
}

#[tauri::command]
pub fn open_mod_folder(workshop_id: String) -> Result<(), String> {
    parse_workshop_id(&workshop_id)?;
    let steam = discover_steam()?;
    let installed = discover_from_roots(&steam.library_roots)?;
    let item = installed
        .iter()
        .find(|item| item.workshop_id == workshop_id)
        .ok_or_else(|| format!("Workshop mod {workshop_id} is not installed"))?;

    Command::new("explorer")
        .arg(&item.path)
        .spawn()
        .map_err(|error| format!("failed to open Workshop mod folder: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn launch_server(state: State<'_, LauncherState>, server: DayzServer) -> Result<(), String> {
    let steam = discover_steam()?;
    let dayz_root = steam.dayz_root.as_deref().ok_or_else(|| {
        "DayZ_x64.exe was not found in the detected DayZ installation.".to_string()
    })?;
    if steam.dayz_exe.is_none() {
        return Err("DayZ_x64.exe was not found in the detected DayZ installation.".to_string());
    }
    if !dayz_root.join("DayZ_BE.exe").is_file() {
        return Err("DayZ_BE.exe was not found in the detected DayZ installation.".to_string());
    }

    let installed_mods = discover_from_roots(&steam.library_roots)?;
    verify_required_mods(&server.required_workshop_ids, &installed_mods)?;

    let mut settings = state.settings().load()?;
    let steam_persona_name = steam.steam_exe.parent().and_then(detect_persona_name);
    settings.dayz_name = resolve_player_name(&settings.dayz_name, steam_persona_name.as_deref());
    let launch = build_dayz_launch_command(&server, &settings, &installed_mods, dayz_root)?;

    Command::new(&launch.executable)
        .current_dir(&launch.working_directory)
        .args(&launch.args)
        .spawn()
        .map_err(|error| format!("failed to launch DayZ with BattlEye: {error}"))?;

    state.collections().record_recent(&server)
}
