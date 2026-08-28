use crate::models::{InstalledMod, ModSyncPlan};
use std::collections::HashMap;
use std::path::Path;

pub fn build_sync_plan(required_ids: &[String], installed: &[InstalledMod]) -> ModSyncPlan {
    let installed_by_id: HashMap<&str, &InstalledMod> = installed
        .iter()
        .map(|item| (item.workshop_id.as_str(), item))
        .collect();

    let mut available = Vec::new();
    let mut missing = Vec::new();

    for workshop_id in required_ids {
        if let Some(item) = installed_by_id.get(workshop_id.as_str()) {
            available.push((*item).clone());
        } else {
            missing.push(workshop_id.clone());
        }
    }

    ModSyncPlan {
        required: required_ids.to_vec(),
        installed: available,
        missing,
    }
}

pub fn verify_required_mods(
    required_ids: &[String],
    installed: &[InstalledMod],
) -> Result<(), String> {
    let installed_by_id: HashMap<&str, &InstalledMod> = installed
        .iter()
        .map(|item| (item.workshop_id.as_str(), item))
        .collect();

    for workshop_id in required_ids {
        let item = installed_by_id
            .get(workshop_id.as_str())
            .ok_or_else(|| format!("required Workshop mod {workshop_id} is not installed"))?;

        if !Path::new(&item.path).is_dir() {
            return Err(format!(
                "required Workshop mod {workshop_id} is missing from disk"
            ));
        }
    }

    Ok(())
}
