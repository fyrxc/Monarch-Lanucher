use crate::models::DayzServer;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const RECENT_LIMIT: usize = 20;

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CollectionsData {
    favorites: Vec<DayzServer>,
    recent: Vec<DayzServer>,
}

pub struct CollectionsStore {
    root: PathBuf,
}

impl CollectionsStore {
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    pub fn favorites(&self) -> Result<Vec<DayzServer>, String> {
        Ok(self.load()?.favorites)
    }

    pub fn recent(&self) -> Result<Vec<DayzServer>, String> {
        Ok(self.load()?.recent)
    }

    pub fn toggle_favorite(&self, server: &DayzServer) -> Result<bool, String> {
        let mut data = self.load()?;
        let identity = server_identity(server);
        if let Some(index) = data
            .favorites
            .iter()
            .position(|item| server_identity(item) == identity)
        {
            data.favorites.remove(index);
            self.save(&data)?;
            return Ok(false);
        }

        data.favorites.push(server.clone());
        self.save(&data)?;
        Ok(true)
    }

    pub fn record_recent(&self, server: &DayzServer) -> Result<(), String> {
        let mut data = self.load()?;
        let identity = server_identity(server);
        data.recent
            .retain(|item| server_identity(item) != identity);
        data.recent.insert(0, server.clone());
        data.recent.truncate(RECENT_LIMIT);
        self.save(&data)
    }

    pub fn clear_recent(&self) -> Result<(), String> {
        let mut data = self.load()?;
        data.recent.clear();
        self.save(&data)
    }

    fn load(&self) -> Result<CollectionsData, String> {
        let path = self.path();
        if !path.exists() {
            return Ok(CollectionsData::default());
        }

        let body = fs::read_to_string(&path)
            .map_err(|error| format!("failed to read server collections: {error}"))?;
        serde_json::from_str(&body)
            .map_err(|error| format!("failed to parse server collections: {error}"))
    }

    fn save(&self, data: &CollectionsData) -> Result<(), String> {
        fs::create_dir_all(&self.root)
            .map_err(|error| format!("failed to create collections directory: {error}"))?;
        let body = serde_json::to_string_pretty(data)
            .map_err(|error| format!("failed to serialize server collections: {error}"))?;
        atomic_write(&self.path(), body.as_bytes())
    }

    fn path(&self) -> PathBuf {
        self.root.join("servers.json")
    }
}

fn server_identity(server: &DayzServer) -> String {
    if server.id.trim().is_empty() {
        format!("{}:{}", server.ip.trim().to_ascii_lowercase(), server.game_port)
    } else {
        server.id.trim().to_string()
    }
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let temp = path.with_extension("json.tmp");
    fs::write(&temp, bytes)
        .map_err(|error| format!("failed to write server collections: {error}"))?;
    if path.exists() {
        fs::remove_file(path)
            .map_err(|error| format!("failed to replace server collections: {error}"))?;
    }
    fs::rename(&temp, path)
        .map_err(|error| format!("failed to finalize server collections: {error}"))
}
