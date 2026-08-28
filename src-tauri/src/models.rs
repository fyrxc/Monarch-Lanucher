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

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LauncherSettings {
    pub dayz_name: String,
    pub extra_launch_parameters: String,
}
