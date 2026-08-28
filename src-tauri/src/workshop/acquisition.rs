use std::path::{Path, PathBuf};

pub const DAYZ_APP_ID: &str = "221100";

pub fn build_download_args(workshop_id: &str) -> Result<Vec<String>, String> {
    validate_workshop_id(workshop_id)?;

    Ok(vec![
        "+login".to_string(),
        "anonymous".to_string(),
        "+workshop_download_item".to_string(),
        DAYZ_APP_ID.to_string(),
        workshop_id.to_string(),
        "validate".to_string(),
        "+quit".to_string(),
    ])
}

pub fn managed_mod_path(steamcmd_root: &Path, workshop_id: &str) -> PathBuf {
    steamcmd_root
        .join("steamapps")
        .join("workshop")
        .join("content")
        .join(DAYZ_APP_ID)
        .join(workshop_id)
}

fn validate_workshop_id(workshop_id: &str) -> Result<(), String> {
    match workshop_id.parse::<u64>() {
        Ok(value) if value > 0 => Ok(()),
        _ => Err(format!("invalid Workshop id: {workshop_id}")),
    }
}
