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

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LauncherSettings {
    pub dayz_name: String,
    pub extra_launch_parameters: String,
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
    pub needs_update: bool,
    pub is_downloading: bool,
    pub is_subscribed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RequiredModState {
    Installed,
    Missing,
    Updating,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RequiredMod {
    pub workshop_id: String,
    pub name: String,
    pub preview_url: Option<String>,
    pub state: RequiredModState,
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
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub notes: Option<String>,
}