use crate::models::UpdateInfo;
use reqwest::Url;
use serde::Deserialize;
use std::fs;
use std::process::Command;
use tauri::AppHandle;
use tauri_plugin_updater::{Updater, UpdaterExt};

const UPDATE_ENDPOINT: &str =
    "https://github.com/fyrxc/Monarch-Lanucher/releases/latest/download/latest.json";
const FALLBACK_INSTALLER_URL: &str =
    "https://github.com/fyrxc/Monarch-Lanucher/releases/latest/download/MonarchLauncher-Setup.exe";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateCandidate {
    pub version: String,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LatestManifest {
    version: String,
    #[serde(default)]
    notes: Option<String>,
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

fn signing_public_key() -> Option<&'static str> {
    option_env!("MONARCH_UPDATER_PUBLIC_KEY")
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn configured_updater(app: &AppHandle, public_key: &str) -> Result<Updater, String> {
    let endpoint =
        Url::parse(UPDATE_ENDPOINT).map_err(|error| format!("invalid update endpoint: {error}"))?;

    app.updater_builder()
        .pubkey(public_key.to_string())
        .endpoints(vec![endpoint])
        .map_err(|error| format!("failed to configure updater: {error}"))?
        .build()
        .map_err(|error| format!("failed to initialize updater: {error}"))
}

async fn fallback_candidate(current_version: &str) -> Result<Option<UpdateCandidate>, String> {
    let response = reqwest::get(UPDATE_ENDPOINT)
        .await
        .map_err(|error| format!("failed to check GitHub Releases for updates: {error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "GitHub update metadata request failed with HTTP {}",
            response.status()
        ));
    }
    let body = response
        .text()
        .await
        .map_err(|error| format!("failed to read GitHub update metadata: {error}"))?;
    let manifest: LatestManifest = serde_json::from_str(&body)
        .map_err(|error| format!("invalid GitHub update metadata: {error}"))?;
    if manifest.version.trim() == current_version.trim() {
        return Ok(None);
    }
    Ok(Some(UpdateCandidate {
        version: manifest.version,
        notes: manifest.notes,
    }))
}

async fn install_fallback(app: &AppHandle) -> Result<(), String> {
    let response = reqwest::get(FALLBACK_INSTALLER_URL)
        .await
        .map_err(|error| format!("failed to download Monarch Launcher update: {error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "Monarch Launcher update download failed with HTTP {}",
            response.status()
        ));
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("failed to read Monarch Launcher update: {error}"))?;
    if bytes.len() < 1024 {
        return Err("Downloaded Monarch Launcher update was unexpectedly small.".to_string());
    }

    let installer = std::env::temp_dir().join("MonarchLauncher-Update.exe");
    fs::write(&installer, &bytes)
        .map_err(|error| format!("failed to stage Monarch Launcher update: {error}"))?;
    Command::new(&installer)
        .spawn()
        .map_err(|error| format!("failed to start Monarch Launcher update: {error}"))?;
    app.exit(0);
    Ok(())
}

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<UpdateInfo, String> {
    let current_version = app.package_info().version.to_string();

    let candidate = if let Some(public_key) = signing_public_key() {
        configured_updater(&app, public_key)?
            .check()
            .await
            .map_err(|error| format!("failed to check for updates: {error}"))?
            .map(|update| UpdateCandidate {
                version: update.version,
                notes: update.body,
            })
    } else {
        fallback_candidate(&current_version).await?
    };

    Ok(summarize_update(&current_version, candidate))
}

#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    if let Some(public_key) = signing_public_key() {
        let update = configured_updater(&app, public_key)?
            .check()
            .await
            .map_err(|error| format!("failed to check for updates: {error}"))?
            .ok_or_else(|| "No newer Monarch Launcher update is available.".to_string())?;

        return update
            .download_and_install(|_, _| {}, || {})
            .await
            .map_err(|error| format!("failed to install update: {error}"));
    }

    let current_version = app.package_info().version.to_string();
    if fallback_candidate(&current_version).await?.is_none() {
        return Err("No newer Monarch Launcher update is available.".to_string());
    }
    install_fallback(&app).await
}
