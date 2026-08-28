use crate::models::InstalledMod;
use crate::workshop::discovery::discover_from_roots;
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

pub fn acquire_with_runner<F>(
    steamcmd_root: &Path,
    workshop_id: &str,
    runner: F,
) -> Result<InstalledMod, String>
where
    F: FnOnce(&[String]) -> Result<(), String>,
{
    let args = build_download_args(workshop_id)?;
    runner(&args)?;

    let expected_path = managed_mod_path(steamcmd_root, workshop_id);
    if !expected_path.is_dir() {
        return Err(format!(
            "Workshop item {workshop_id} was not found after SteamCMD completed: {}",
            expected_path.display()
        ));
    }

    discover_from_roots(&[steamcmd_root.to_path_buf()])?
        .into_iter()
        .find(|item| item.workshop_id == workshop_id)
        .ok_or_else(|| {
            format!(
                "Workshop item {workshop_id} could not be verified after SteamCMD completed: {}",
                expected_path.display()
            )
        })
}

fn validate_workshop_id(workshop_id: &str) -> Result<(), String> {
    match workshop_id.parse::<u64>() {
        Ok(value) if value > 0 => Ok(()),
        _ => Err(format!("invalid Workshop id: {workshop_id}")),
    }
}
