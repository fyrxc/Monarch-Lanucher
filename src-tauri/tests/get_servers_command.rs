use async_trait::async_trait;
use monarch_launcher::commands::get_servers_from;
use monarch_launcher::models::ServerDirectoryResult;
use monarch_launcher::servers::ServerDirectory;

struct FakeDirectory;

#[async_trait]
impl ServerDirectory for FakeDirectory {
    async fn fetch_servers(&self) -> Result<ServerDirectoryResult, String> {
        Ok(ServerDirectoryResult {
            servers: Vec::new(),
            is_partial: true,
            warning: Some("provider warning".to_string()),
        })
    }
}

#[tokio::test]
async fn get_servers_bridge_forwards_provider_result() {
    let result = get_servers_from(&FakeDirectory)
        .await
        .expect("provider result should pass through");

    assert!(result.is_partial);
    assert_eq!(result.warning.as_deref(), Some("provider warning"));
    assert!(result.servers.is_empty());
}
