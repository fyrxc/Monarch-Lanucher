use crate::models::ServerDirectoryResult;
use crate::servers::ServerDirectory;
use std::sync::Arc;
use tauri::State;

pub struct LauncherState {
    server_directory: Arc<dyn ServerDirectory>,
}

impl LauncherState {
    pub fn new(server_directory: Arc<dyn ServerDirectory>) -> Self {
        Self { server_directory }
    }
}

pub async fn get_servers_from(
    directory: &(dyn ServerDirectory + Send + Sync),
) -> Result<ServerDirectoryResult, String> {
    directory.fetch_servers().await
}

#[tauri::command]
pub async fn get_servers(
    state: State<'_, LauncherState>,
) -> Result<ServerDirectoryResult, String> {
    let directory = Arc::clone(&state.server_directory);
    get_servers_from(directory.as_ref()).await
}
