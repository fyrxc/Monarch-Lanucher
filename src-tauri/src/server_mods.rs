use crate::models::ServerModDetail;
use crate::steam::discover_steam;
use crate::workshop::discovery::discover_from_roots;
use crate::workshop::metadata::fetch_published_file_details;
use crate::workshop::steamworks_ugc::{parse_workshop_id, SteamWorkshopService};
use std::collections::HashSet;

#[tauri::command]
pub async fn get_server_mod_details(
    workshop_ids: Vec<String>,
) -> Result<Vec<ServerModDetail>, String> {
    let mut ordered = Vec::new();
    let mut seen = HashSet::new();
    for value in workshop_ids {
        let id = value.trim().to_string();
        parse_workshop_id(&id)?;
        if seen.insert(id.clone()) {
            ordered.push(id);
        }
    }

    if ordered.is_empty() {
        return Ok(Vec::new());
    }

    let metadata = fetch_published_file_details(&reqwest::Client::new(), &ordered)
        .await
        .unwrap_or_default();
    let steam = discover_steam().ok();
    let installed_ids = steam
        .as_ref()
        .and_then(|paths| discover_from_roots(&paths.library_roots).ok())
        .unwrap_or_default()
        .into_iter()
        .map(|item| item.workshop_id)
        .collect::<HashSet<_>>();
    let steamworks = SteamWorkshopService::initialize().ok();

    Ok(ordered
        .into_iter()
        .map(|workshop_id| {
            let status = steamworks
                .as_ref()
                .and_then(|service| service.status(&workshop_id).ok())
                .unwrap_or_default();
            let name = metadata
                .get(&workshop_id)
                .map(|value| value.title.clone())
                .unwrap_or_else(|| format!("Workshop {workshop_id}"));

            ServerModDetail {
                workshop_id: workshop_id.clone(),
                name,
                is_installed: installed_ids.contains(&workshop_id) || status.is_installed,
                is_downloading: status.is_downloading,
                needs_update: status.needs_update,
            }
        })
        .collect())
}
