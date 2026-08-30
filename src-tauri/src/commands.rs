use crate::collections::CollectionsStore;
use crate::launcher::build_dayz_launch_command_with_password;
use crate::models::{
    DayzServer, InstalledMod, LauncherSettings, RequiredMod, RequiredModState,
    ServerDirectoryResult, SystemStatus, WorkshopMod, WorkshopModMetadata,
};
use crate::servers::ServerDirectory;
use crate::settings::SettingsStore;
use crate::steam::{configure_hidden_command, discover_steam, is_steam_running};
use crate::steam_profile::{detect_persona_name, resolve_player_name};
use crate::workshop::discovery::discover_from_roots;
use crate::workshop::metadata::fetch_published_file_details;
use crate::workshop::steamworks_ugc::{parse_workshop_id, SteamWorkshopService};
use crate::workshop::sync::verify_required_mods;
use std::collections::{HashMap, HashSet};
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
        .join("Monarch Launcher")
}

fn ensure_steam_running() -> Result<(), String> {
    if is_steam_running() {
        Ok(())
    } else {
        Err("Steam must be running before Monarch Launcher can be used.".to_string())
    }
}

fn workshop_url(workshop_id: &str) -> String {
    format!("https://steamcommunity.com/sharedfiles/filedetails/?id={workshop_id}")
}

fn creator_url(creator_id: Option<&str>) -> Option<String> {
    creator_id.map(|id| format!("https://steamcommunity.com/profiles/{id}"))
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
    ensure_steam_running()?;
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
                steam_running: is_steam_running(),
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
pub fn open_steam() -> Result<(), String> {
    let steam = discover_steam()?;
    let mut command = Command::new(&steam.steam_exe);
    configure_hidden_command(&mut command);
    command
        .spawn()
        .map_err(|error| format!("failed to open Steam: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn get_installed_mods() -> Result<Vec<WorkshopMod>, String> {
    ensure_steam_running()?;
    let steam = discover_steam()?;
    let local_mods = get_installed_mods_from(&steam.library_roots)?;
    let steamworks = SteamWorkshopService::initialize().ok();

    Ok(local_mods
        .into_iter()
        .map(|item| {
            let status = steamworks
                .as_ref()
                .and_then(|service| service.status(&item.workshop_id).ok())
                .unwrap_or_default();
            let url = workshop_url(&item.workshop_id);

            WorkshopMod {
                workshop_id: item.workshop_id,
                name: item.name,
                path: item.path,
                preview_url: None,
                creator_id: None,
                workshop_url: url,
                creator_url: None,
                needs_update: status.needs_update,
                is_downloading: status.is_downloading,
                is_subscribed: status.is_subscribed,
            }
        })
        .collect())
}

#[tauri::command]
pub async fn get_workshop_mod_metadata(
    workshop_ids: Vec<String>,
) -> Result<Vec<WorkshopModMetadata>, String> {
    ensure_steam_running()?;
    for workshop_id in &workshop_ids {
        parse_workshop_id(workshop_id)?;
    }

    let metadata = fetch_published_file_details(&reqwest::Client::new(), &workshop_ids).await?;
    Ok(workshop_ids
        .into_iter()
        .filter_map(|workshop_id| {
            let details = metadata.get(&workshop_id)?;
            Some(WorkshopModMetadata {
                workshop_url: workshop_url(&workshop_id),
                creator_url: creator_url(details.creator_id.as_deref()),
                workshop_id,
                name: details.title.clone(),
                preview_url: details.preview_url.clone(),
                creator_id: details.creator_id.clone(),
            })
        })
        .collect())
}

#[tauri::command]
pub async fn get_required_mods(server: DayzServer) -> Result<Vec<RequiredMod>, String> {
    ensure_steam_running()?;
    if server.required_workshop_ids.is_empty() {
        return Ok(Vec::new());
    }

    for workshop_id in &server.required_workshop_ids {
        parse_workshop_id(workshop_id)?;
    }

    let steam = discover_steam()?;
    let local_mods = discover_from_roots(&steam.library_roots)?;
    let local_by_id: HashMap<&str, &InstalledMod> = local_mods
        .iter()
        .map(|item| (item.workshop_id.as_str(), item))
        .collect();
    let metadata =
        fetch_published_file_details(&reqwest::Client::new(), &server.required_workshop_ids)
            .await
            .unwrap_or_default();
    let steamworks = SteamWorkshopService::initialize().ok();

    Ok(server
        .required_workshop_ids
        .iter()
        .map(|workshop_id| {
            let local = local_by_id.get(workshop_id.as_str()).copied();
            let status = steamworks
                .as_ref()
                .and_then(|service| service.status(workshop_id).ok())
                .unwrap_or_default();
            let details = metadata.get(workshop_id);

            let state = if status.is_downloading || (local.is_some() && status.needs_update) {
                RequiredModState::Updating
            } else if local.is_some() {
                RequiredModState::Installed
            } else {
                RequiredModState::Missing
            };

            RequiredMod {
                workshop_id: workshop_id.clone(),
                name: details
                    .map(|value| value.title.clone())
                    .or_else(|| local.map(|item| item.name.clone()))
                    .unwrap_or_else(|| format!("Workshop {workshop_id}")),
                preview_url: details.and_then(|value| value.preview_url.clone()),
                state,
            }
        })
        .collect())
}

#[tauri::command]
pub fn sync_required_mods(server: DayzServer) -> Result<(), String> {
    ensure_steam_running()?;
    if server.required_workshop_ids.is_empty() {
        return Ok(());
    }

    let steam = discover_steam()?;
    let local_mods = discover_from_roots(&steam.library_roots)?;
    let local_ids: HashSet<&str> = local_mods
        .iter()
        .map(|item| item.workshop_id.as_str())
        .collect();
    let steamworks = SteamWorkshopService::initialize()?;

    for workshop_id in &server.required_workshop_ids {
        parse_workshop_id(workshop_id)?;
        let status = steamworks.status(workshop_id)?;
        if !status.is_subscribed {
            steamworks.subscribe(workshop_id)?;
            continue;
        }

        if (!local_ids.contains(workshop_id.as_str()) || status.needs_update)
            && !status.is_downloading
        {
            steamworks.request_update(workshop_id)?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn update_workshop_mod(workshop_id: String) -> Result<(), String> {
    ensure_steam_running()?;
    SteamWorkshopService::initialize()?.request_update(&workshop_id)
}

#[tauri::command]
pub fn unsubscribe_workshop_mod(workshop_id: String) -> Result<(), String> {
    ensure_steam_running()?;
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

    let mut command = Command::new("explorer");
    command.arg(&item.path);
    configure_hidden_command(&mut command);
    command
        .spawn()
        .map_err(|error| format!("failed to open Workshop mod folder: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn launch_server(
    state: State<'_, LauncherState>,
    server: DayzServer,
    password: Option<String>,
) -> Result<(), String> {
    ensure_steam_running()?;
    if server.is_passworded
        && password
            .as_deref()
            .map(str::trim)
            .unwrap_or_default()
            .is_empty()
    {
        return Err("this server requires a password".to_string());
    }

    let steam = discover_steam()?;
    let dayz_root = steam.dayz_root.as_deref().ok_or_else(|| {
        "DayZ_x64.exe was not found in the detected DayZ installation.".to_string()
    })?;
    if steam.dayz_exe.is_none() {
        return Err("DayZ_x64.exe was not found in the detected DayZ installation.".to_string());
    }

    let installed_mods = discover_from_roots(&steam.library_roots)?;
    verify_required_mods(&server.required_workshop_ids, &installed_mods)?;

    if let Ok(steamworks) = SteamWorkshopService::initialize() {
        for workshop_id in &server.required_workshop_ids {
            let status = steamworks.status(workshop_id)?;
            if status.is_downloading || status.needs_update {
                return Err(format!(
                    "required Workshop mod {workshop_id} is still updating"
                ));
            }
        }
    }

    let mut settings = state.settings().load()?;
    if !settings.skip_battleye && steam.dayz_be_exe.is_none() {
        return Err("DayZ_BE.exe was not found in the detected DayZ installation.".to_string());
    }

    let steam_persona_name = steam.steam_exe.parent().and_then(detect_persona_name);
    settings.dayz_name = resolve_player_name(&settings.dayz_name, steam_persona_name.as_deref());
    let launch = build_dayz_launch_command_with_password(
        &server,
        &settings,
        &installed_mods,
        dayz_root,
        password.as_deref(),
    )?;

    let mut command = Command::new(&launch.executable);
    command
        .current_dir(&launch.working_directory)
        .args(&launch.args);
    configure_hidden_command(&mut command);
    command
        .spawn()
        .map_err(|error| format!("failed to launch DayZ: {error}"))?;

    state.collections().record_recent(&server)
}
