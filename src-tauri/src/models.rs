use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DayzServer {
    pub id: String,
    pub name: String,
    pub map: String,
    pub players: u32,
    pub capacity: u32,
    pub ping: Option<u32>,
    pub ip: String,
    pub game_port: u16,
    pub query_port: u16,
    pub status: String,
    pub is_passworded: bool,
    pub is_official: bool,
    pub first_person_only: bool,
    pub country: String,
    pub required_workshop_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ServerDirectoryResult {
    pub servers: Vec<DayzServer>,
    pub is_partial: bool,
    pub warning: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default, rename_all = "camelCase")]
pub struct LauncherSettings {
    pub dayz_name: String,
    pub dayz_path: String,
    pub extra_launch_parameters: String,
    pub skip_battleye: bool,
    pub discord_presence: bool,
}

impl Default for LauncherSettings {
    fn default() -> Self {
        Self {
            dayz_name: String::new(),
            dayz_path: String::new(),
            extra_launch_parameters: String::new(),
            skip_battleye: false,
            discord_presence: true,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SystemStatus {
    pub steam_found: bool,
    pub steam_path: Option<String>,
    pub steam_persona_name: Option<String>,
    pub dayz_found: bool,
    pub dayz_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct InstalledMod {
    pub workshop_id: String,
    pub name: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkshopMod {
    pub workshop_id: String,
    pub name: String,
    pub path: String,
    pub preview_url: Option<String>,
    pub description: Option<String>,
    pub file_size: Option<u64>,
    pub time_updated: Option<u64>,
    pub needs_update: bool,
    pub is_downloading: bool,
    pub is_subscribed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ServerModDetail {
    pub workshop_id: String,
    pub name: String,
    pub is_installed: bool,
    pub is_downloading: bool,
    pub needs_update: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ModSyncPlan {
    pub required: Vec<String>,
    pub installed: Vec<InstalledMod>,
    pub missing: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ServerLaunchPreflight {
    pub ready: bool,
    pub missing_workshop_ids: Vec<String>,
    pub dayz_running: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkshopDownloadProgress {
    pub workshop_id: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub is_downloading: bool,
    pub is_installed: bool,
    pub is_subscribed: bool,
    pub needs_update: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub notes: Option<String>,
}
