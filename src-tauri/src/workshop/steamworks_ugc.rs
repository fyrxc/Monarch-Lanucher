use crate::models::WorkshopDownloadProgress;
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};
use steamworks::{AppId, Client, ItemState, PublishedFileId};

const DAYZ_APP_ID: u32 = 221100;
const CALLBACK_TIMEOUT: Duration = Duration::from_secs(10);
const CALLBACK_POLL_INTERVAL: Duration = Duration::from_millis(50);

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct WorkshopItemStatus {
    pub needs_update: bool,
    pub is_downloading: bool,
    pub is_subscribed: bool,
    pub is_installed: bool,
}

pub struct SteamWorkshopService {
    client: Client,
}

impl SteamWorkshopService {
    pub fn initialize() -> Result<Self, String> {
        let client = Client::init_app(AppId(DAYZ_APP_ID))
            .map_err(|error| format!("failed to initialize Steam Workshop access: {error}"))?;
        Ok(Self { client })
    }

    pub fn status(&self, workshop_id: &str) -> Result<WorkshopItemStatus, String> {
        let id = parse_workshop_id(workshop_id)?;
        let state = self.client.ugc().item_state(id);

        Ok(WorkshopItemStatus {
            needs_update: state.contains(ItemState::NEEDS_UPDATE),
            is_downloading: state.contains(ItemState::DOWNLOADING)
                || state.contains(ItemState::DOWNLOAD_PENDING),
            is_subscribed: state.contains(ItemState::SUBSCRIBED),
            is_installed: state.contains(ItemState::INSTALLED),
        })
    }

    pub fn download_progress(&self, workshop_id: &str) -> Result<WorkshopDownloadProgress, String> {
        let id = parse_workshop_id(workshop_id)?;
        let state = self.client.ugc().item_state(id);
        let (downloaded_bytes, total_bytes) = self.client.ugc().item_download_info(id).unwrap_or((0, 0));

        Ok(WorkshopDownloadProgress {
            workshop_id: workshop_id.to_string(),
            downloaded_bytes,
            total_bytes,
            is_downloading: state.contains(ItemState::DOWNLOADING)
                || state.contains(ItemState::DOWNLOAD_PENDING),
            is_installed: state.contains(ItemState::INSTALLED),
            is_subscribed: state.contains(ItemState::SUBSCRIBED),
            needs_update: state.contains(ItemState::NEEDS_UPDATE),
        })
    }

    pub fn request_update(&self, workshop_id: &str) -> Result<(), String> {
        let id = parse_workshop_id(workshop_id)?;
        if self.client.ugc().download_item(id, true) {
            Ok(())
        } else {
            Err(format!(
                "Steam did not accept the update request for Workshop mod {workshop_id}"
            ))
        }
    }

    pub fn subscribe_and_download(&self, workshop_id: &str) -> Result<(), String> {
        let id = parse_workshop_id(workshop_id)?;
        let state = self.client.ugc().item_state(id);

        if !state.contains(ItemState::SUBSCRIBED) {
            let (sender, receiver) = mpsc::channel::<Result<(), String>>();
            self.client.ugc().subscribe_item(id, move |result| {
                let _ = sender.send(
                    result.map_err(|error| format!("Steam failed to subscribe Workshop mod: {error}")),
                );
            });
            self.wait_for_callback(
                receiver,
                format!("Steam timed out while subscribing Workshop mod {workshop_id}"),
            )?;
        }

        if self.client.ugc().download_item(id, true) {
            Ok(())
        } else {
            Err(format!(
                "Steam did not accept the download request for Workshop mod {workshop_id}"
            ))
        }
    }

    pub fn unsubscribe(&self, workshop_id: &str) -> Result<(), String> {
        let id = parse_workshop_id(workshop_id)?;
        let (sender, receiver) = mpsc::channel::<Result<(), String>>();

        self.client.ugc().unsubscribe_item(id, move |result| {
            let _ = sender.send(
                result
                    .map_err(|error| format!("Steam failed to unsubscribe Workshop mod: {error}")),
            );
        });

        self.wait_for_callback(
            receiver,
            format!("Steam timed out while unsubscribing Workshop mod {workshop_id}"),
        )
    }

    fn wait_for_callback(
        &self,
        receiver: mpsc::Receiver<Result<(), String>>,
        timeout_message: String,
    ) -> Result<(), String> {
        let deadline = Instant::now() + CALLBACK_TIMEOUT;
        loop {
            self.client.run_callbacks();
            match receiver.try_recv() {
                Ok(result) => return result,
                Err(mpsc::TryRecvError::Disconnected) => {
                    return Err("Steam Workshop callback disconnected".to_string())
                }
                Err(mpsc::TryRecvError::Empty) => {}
            }

            if Instant::now() >= deadline {
                return Err(timeout_message);
            }
            thread::sleep(CALLBACK_POLL_INTERVAL);
        }
    }
}

pub fn parse_workshop_id(workshop_id: &str) -> Result<PublishedFileId, String> {
    let value = workshop_id
        .trim()
        .parse::<u64>()
        .map_err(|_| format!("invalid Workshop ID {workshop_id}"))?;
    if value == 0 {
        return Err("Workshop ID cannot be zero".to_string());
    }
    Ok(PublishedFileId(value))
}
