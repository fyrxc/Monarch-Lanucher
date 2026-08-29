use crate::collections::CollectionsStore;
use crate::launcher::build_dayz_launch_command_with_options;
use crate::models::{
    DayzServer, InstalledMod, LauncherSettings, ServerDirectoryResult, ServerLaunchPreflight,
    SystemStatus, WorkshopDownloadProgress, WorkshopMod,
};
use crate::process::{close_dayz_processes, is_dayz_running, is_steam_running};
use crate::servers::ServerDirectory;
use crate::settings::SettingsStore;
use crate::steam::discover_steam;
use crate::steam_profile::{detect_persona_name, resolve_player_name};
use crate::workshop::discovery::discover_from_roots;
use crate::workshop::metadata::fetch_published_file_details;
use crate::workshop::steamworks_ugc::{parse_workshop_id, SteamWorkshopService};
use crate::workshop::sync::{build_launch_preflight, verify_required_mods};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
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

fn require_steam_running() -> Result<(), String> {
    match is_steam_running() {
        Ok(true) => Ok(()),
        Ok(false) => Err("Steam must be open and signed in before using Monarch.".to_string()),
        Err(error) => Err(format!("Unable to verify the Steam client: {error}")),
    }
}

pub async fn get_servers_from(
    directory: &(dyn ServerDirectory + Send + Sync),
) -> Result<ServerDirectoryResult, String> {
    directory.fetch_servers().await
}

pub fn get_installed_mods_from(roots: &[PathBuf]) -> Result<Vec<InstalledMod>, String> {
    discover_from_roots(roots)
}

pub fn merge_workshop_ids(local: &[InstalledMod], subscribed: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    local
        .iter()
        .map(|item| item.workshop_id.clone())
        .chain(subscribed.iter().cloned())
        .filter(|id| seen.insert(id.clone()))
        .collect()
}

fn configured_dayz_root(
    settings: &LauncherSettings,
    detected_root: Option<&Path>,
) -> Result<PathBuf, String> {
    let configured = settings.dayz_path.trim();
    let root = if configured.is_empty() {
        detected_root.map(Path::to_path_buf).ok_or_else(|| {
            "DayZ_x64.exe was not found in the detected DayZ installation.".to_string()
        })?
    } else {
        let path = PathBuf::from(configured);
        if path
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| name.eq_ignore_ascii_case("DayZ_x64.exe"))
        {
            path.parent()
                .map(Path::to_path_buf)
                .ok_or_else(|| "The configured DayZ path is invalid.".to_string())?
        } else {
            path
        }
    };

    if !root.join("DayZ_x64.exe").is_file() {
        return Err(format!(
            "DayZ_x64.exe was not found at {}",
            root.to_string_lossy()
        ));
    }
    Ok(root)
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
            let steam_running = is_steam_running().unwrap_or(false);
            let steam_persona_name = if steam_running {
                paths.steam_exe.parent().and_then(detect_persona_name)
            } else {
                None
            };

            SystemStatus {
                steam_found: true,
                steam_running,
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
    require_steam_running()?;
    let steam = discover_steam()?;
    let local_mods = get_installed_mods_from(&steam.library_roots)?;
    let steamworks = SteamWorkshopService::initialize().ok();
    let subscribed = steamworks
        .as_ref()
        .map(SteamWorkshopService::subscribed_items)
        .unwrap_or_default();
    let workshop_ids = merge_workshop_ids(&local_mods, &subscribed);
    let local_by_id = local_mods
        .into_iter()
        .map(|item| (item.workshop_id.clone(), item))
        .collect::<HashMap<_, _>>();

    let metadata = fetch_published_file_details(&reqwest::Client::new(), &workshop_ids)
        .await
        .unwrap_or_default();

    Ok(workshop_ids
        .into_iter()
        .filter_map(|workshop_id| {
            let local = local_by_id.get(&workshop_id);
            let details = metadata.get(&workshop_id);
            let status = steamworks
                .as_ref()
                .and_then(|service| service.status(&workshop_id).ok())
                .unwrap_or_default();

            if local.is_none() && !status.is_subscribed {
                return None;
            }

            Some(WorkshopMod {
                workshop_id: workshop_id.clone(),
                name: details
                    .map(|value| value.title.clone())
                    .or_else(|| local.map(|value| value.name.clone()))
                    .unwrap_or_else(|| format!("Workshop {workshop_id}")),
                path: local.map(|value| value.path.clone()).unwrap_or_default(),
                preview_url: details.and_then(|value| value.preview_url.clone()),
                description: details.and_then(|value| value.description.clone()),
                creator: details.and_then(|value| value.creator.clone()),
                file_size: details.and_then(|value| value.file_size),
                time_updated: details.and_then(|value| value.time_updated),
                needs_update: status.needs_update,
                is_downloading: status.is_downloading,
                is_subscribed: status.is_subscribed || local.is_some(),
            })
        })
        .collect())
}

#[tauri::command]
pub fn update_workshop_mod(workshop_id: String) -> Result<(), String> {
    require_steam_running()?;
    SteamWorkshopService::initialize()?.request_update(&workshop_id)
}

#[tauri::command]
pub fn unsubscribe_workshop_mod(workshop_id: String) -> Result<(), String> {
    require_steam_running()?;
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
pub fn prepare_server_launch(server: DayzServer) -> Result<ServerLaunchPreflight, String> {
    require_steam_running()?;
    let steam = discover_steam()?;
    let installed_mods = discover_from_roots(&steam.library_roots)?;
    let running = is_dayz_running()?;

    Ok(build_launch_preflight(
        &server.required_workshop_ids,
        &installed_mods,
        running,
    ))
}

#[tauri::command]
pub async fn setup_server_mods(workshop_ids: Vec<String>) -> Result<(), String> {
    require_steam_running()?;
    tauri::async_runtime::spawn_blocking(move || {
        let steamworks = SteamWorkshopService::initialize()?;
        for workshop_id in workshop_ids {
            steamworks.subscribe_and_download(&workshop_id)?;
        }
        Ok::<(), String>(())
    })
    .await
    .map_err(|error| format!("Steam Workshop setup task failed: {error}"))?
}

#[tauri::command]
pub async fn get_workshop_download_progress(
    workshop_ids: Vec<String>,
) -> Result<Vec<WorkshopDownloadProgress>, String> {
    require_steam_running()?;
    tauri::async_runtime::spawn_blocking(move || {
        let steamworks = SteamWorkshopService::initialize()?;
        workshop_ids
            .iter()
            .map(|workshop_id| steamworks.download_progress(workshop_id))
            .collect::<Result<Vec<_>, _>>()
    })
    .await
    .map_err(|error| format!("Steam Workshop progress task failed: {error}"))?
}

#[tauri::command]
pub fn close_dayz() -> Result<(), String> {
    close_dayz_processes()
}

#[tauri::command]
pub fn launch_server(
    state: State<'_, LauncherState>,
    server: DayzServer,
    password: Option<String>,
) -> Result<(), String> {
    require_steam_running()?;
    if is_dayz_running()? {
        return Err("DayZ is already running.".to_string());
    }

    let steam = discover_steam()?;
    let mut settings = state.settings().load()?;
    let dayz_root = configured_dayz_root(&settings, steam.dayz_root.as_deref())?;
    if !settings.skip_battleye && !dayz_root.join("DayZ_BE.exe").is_file() {
        return Err("DayZ_BE.exe was not found in the configured DayZ installation.".to_string());
    }

    let installed_mods = discover_from_roots(&steam.library_roots)?;
    verify_required_mods(&server.required_workshop_ids, &installed_mods)?;

    let steam_persona_name = steam.steam_exe.parent().and_then(detect_persona_name);
    settings.dayz_name = resolve_player_name(&settings.dayz_name, steam_persona_name.as_deref());
    let launch = build_dayz_launch_command_with_options(
        &server,
        &settings,
        &installed_mods,
        &dayz_root,
        password.as_deref(),
        settings.skip_battleye,
    )?;

    Command::new(&launch.executable)
        .current_dir(&launch.working_directory)
        .args(&launch.args)
        .spawn()
        .map_err(|error| format!("failed to launch DayZ: {error}"))?;

    state.collections().record_recent(&server)
}
