use crate::models::LauncherSettings;
use std::fs;
use std::path::{Path, PathBuf};

pub struct SettingsStore {
    root: PathBuf,
}

impl SettingsStore {
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    pub fn load(&self) -> Result<LauncherSettings, String> {
        let path = self.path();
        if !path.exists() {
            return Ok(LauncherSettings::default());
        }

        let body = fs::read_to_string(&path)
            .map_err(|error| format!("failed to read settings: {error}"))?;
        serde_json::from_str(&body).map_err(|error| format!("failed to parse settings: {error}"))
    }

    pub fn save(&self, settings: &LauncherSettings) -> Result<(), String> {
        fs::create_dir_all(&self.root)
            .map_err(|error| format!("failed to create settings directory: {error}"))?;
        let body = serde_json::to_string_pretty(settings)
            .map_err(|error| format!("failed to serialize settings: {error}"))?;
        atomic_write(&self.path(), body.as_bytes())
    }

    fn path(&self) -> PathBuf {
        self.root.join("settings.json")
    }
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let temp = path.with_extension("json.tmp");
    fs::write(&temp, bytes).map_err(|error| format!("failed to write settings: {error}"))?;
    if path.exists() {
        fs::remove_file(path).map_err(|error| format!("failed to replace settings: {error}"))?;
    }
    fs::rename(&temp, path).map_err(|error| format!("failed to finalize settings: {error}"))
}
