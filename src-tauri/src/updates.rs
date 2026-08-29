use crate::models::UpdateInfo;
use reqwest::{Client, Url};
use serde::Deserialize;
use std::cmp::Ordering;
use std::fs;
use std::process::Command;
use tauri::AppHandle;
use tauri_plugin_updater::{Updater, UpdaterExt};

const UPDATE_ENDPOINT: &str =
    "https://github.com/fyrxc/Monarch-Lanucher/releases/latest/download/latest.json";
const FALLBACK_INSTALLER_URL: &str =
    "https://github.com/fyrxc/Monarch-Lanucher/releases/latest/download/MonarchLauncher-Setup.exe";
const LATEST_RELEASE_API: &str =
    "https://api.github.com/repos/fyrxc/Monarch-Lanucher/releases/latest";

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

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    #[serde(default)]
    body: Option<String>,
    #[serde(default)]
    assets: Vec<GithubAsset>,
}

#[derive(Debug, Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
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

fn version_parts(version: &str) -> Option<Vec<u64>> {
    let trimmed = version.trim().trim_start_matches(['v', 'V']);
    if trimmed.is_empty() {
        return None;
    }
    trimmed
        .split('.')
        .map(|part| part.parse::<u64>().ok())
        .collect()
}

pub fn is_newer_version(candidate: &str, current: &str) -> bool {
    let (Some(mut candidate), Some(mut current)) =
        (version_parts(candidate), version_parts(current))
    else {
        return candidate.trim() != current.trim();
    };
    let width = candidate.len().max(current.len());
    candidate.resize(width, 0);
    current.resize(width, 0);
    candidate.cmp(&current) == Ordering::Greater
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

fn github_client() -> Result<Client, String> {
    Client::builder()
        .user_agent("MonarchLauncher/0.4")
        .build()
        .map_err(|error| format!("failed to initialize GitHub updater client: {error}"))
}

async fn github_release_fallback(
    client: &Client,
    current_version: &str,
) -> Result<(Option<UpdateCandidate>, Option<String>), String> {
    let response = client
        .get(LATEST_RELEASE_API)
        .send()
        .await
        .map_err(|error| format!("failed to check GitHub Releases for updates: {error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "GitHub Releases request failed with HTTP {}",
            response.status()
        ));
    }

    let release = response
        .json::<GithubRelease>()
        .await
        .map_err(|error| format!("invalid GitHub release response: {error}"))?;
    let version = release.tag_name.trim().trim_start_matches(['v', 'V']);
    if !is_newer_version(version, current_version) {
        return Ok((None, None));
    }

    let installer_url = release
        .assets
        .iter()
        .find(|asset| asset.name.eq_ignore_ascii_case("MonarchLauncher-Setup.exe"))
        .map(|asset| asset.browser_download_url.clone());
    Ok((
        Some(UpdateCandidate {
            version: version.to_string(),
            notes: release.body.filter(|value| !value.trim().is_empty()),
        }),
        installer_url,
    ))
}

async fn fallback_release(
    current_version: &str,
) -> Result<(Option<UpdateCandidate>, Option<String>), String> {
    let client = github_client()?;
    let response = client
        .get(UPDATE_ENDPOINT)
        .send()
        .await
        .map_err(|error| format!("failed to check GitHub Releases for updates: {error}"))?;

    if response.status().is_success() {
        let manifest = response
            .json::<LatestManifest>()
            .await
            .map_err(|error| format!("invalid GitHub update metadata: {error}"))?;
        if !is_newer_version(&manifest.version, current_version) {
            return Ok((None, None));
        }
        return Ok((
            Some(UpdateCandidate {
                version: manifest.version,
                notes: manifest.notes,
            }),
            Some(FALLBACK_INSTALLER_URL.to_string()),
        ));
    }

    github_release_fallback(&client, current_version).await
}

async fn install_fallback(app: &AppHandle, installer_url: &str) -> Result<(), String> {
    let response = github_client()?
        .get(installer_url)
        .send()
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
        fallback_release(&current_version).await?.0
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
    let (candidate, installer_url) = fallback_release(&current_version).await?;
    if candidate.is_none() {
        return Err("No newer Monarch Launcher update is available.".to_string());
    }
    let installer_url = installer_url.ok_or_else(|| {
        "The latest Monarch release does not include a Windows setup executable yet.".to_string()
    })?;
    install_fallback(&app, &installer_url).await
}
