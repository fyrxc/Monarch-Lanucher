use crate::models::UpdateInfo;
use reqwest::Url;
use tauri::AppHandle;
use tauri_plugin_updater::{Updater, UpdaterExt};

const UPDATE_ENDPOINT: &str =
    "https://github.com/fyrxc/Monarch-Lanucher/releases/latest/download/latest.json";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateCandidate {
    pub version: String,
    pub notes: Option<String>,
}

pub fn summarize_update(current_version: &str, candidate: Option<UpdateCandidate>) -> UpdateInfo {
    match candidate {
        Some(candidate) => UpdateInfo {
            available: true,
            current_version: current_version.to_string(),
            latest_version: Some(candidate.version),
            notes: candidate.notes,
        },
        None => UpdateInfo {
            available: false,
            current_version: current_version.to_string(),
            latest_version: None,
            notes: None,
        },
    }
}

fn signing_public_key() -> Result<&'static str, String> {
    option_env!("MONARCH_UPDATER_PUBLIC_KEY")
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Automatic updates are not configured in this build.".to_string())
}

fn configured_updater(app: &AppHandle) -> Result<Updater, String> {
    let endpoint =
        Url::parse(UPDATE_ENDPOINT).map_err(|error| format!("invalid update endpoint: {error}"))?;

    app.updater_builder()
        .pubkey(signing_public_key()?.to_string())
        .endpoints(vec![endpoint])
        .map_err(|error| format!("failed to configure updater: {error}"))?
        .build()
        .map_err(|error| format!("failed to initialize updater: {error}"))
}

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<UpdateInfo, String> {
    let current_version = app.package_info().version.to_string();
    let update = configured_updater(&app)?
        .check()
        .await
        .map_err(|error| format!("failed to check for updates: {error}"))?;

    let candidate = update.map(|update| UpdateCandidate {
        version: update.version,
        notes: update.body,
    });

    Ok(summarize_update(&current_version, candidate))
}

#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    let update = configured_updater(&app)?
        .check()
        .await
        .map_err(|error| format!("failed to check for updates: {error}"))?
        .ok_or_else(|| "No newer Monarch Launcher update is available.".to_string())?;

    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|error| format!("failed to install update: {error}"))
}
