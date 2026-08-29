use serde::Deserialize;
use std::collections::HashMap;

const PUBLISHED_FILE_DETAILS_URL: &str =
    "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WorkshopMetadata {
    pub title: String,
    pub creator: Option<String>,
    pub preview_url: Option<String>,
    pub description: Option<String>,
    pub file_size: Option<u64>,
    pub time_updated: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct PublishedFileDetailsEnvelope {
    response: PublishedFileDetailsResponse,
}

#[derive(Debug, Deserialize)]
struct PublishedFileDetailsResponse {
    #[serde(default)]
    publishedfiledetails: Vec<PublishedFileDetail>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum NumberOrString {
    Number(u64),
    Text(String),
}

impl NumberOrString {
    fn as_u64(&self) -> Option<u64> {
        match self {
            Self::Number(value) => Some(*value),
            Self::Text(value) => value.trim().parse::<u64>().ok(),
        }
    }

    fn as_text(&self) -> Option<String> {
        match self {
            Self::Number(value) => Some(value.to_string()),
            Self::Text(value) => {
                let value = value.trim();
                (!value.is_empty()).then(|| value.to_string())
            }
        }
    }
}

#[derive(Debug, Deserialize)]
struct PublishedFileDetail {
    publishedfileid: String,
    result: u32,
    #[serde(default)]
    title: String,
    #[serde(default)]
    creator: Option<NumberOrString>,
    #[serde(default)]
    preview_url: Option<String>,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    file_size: Option<NumberOrString>,
    #[serde(default)]
    time_updated: Option<u64>,
}

fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

pub fn parse_published_file_details(
    body: &str,
) -> Result<HashMap<String, WorkshopMetadata>, String> {
    let envelope: PublishedFileDetailsEnvelope = serde_json::from_str(body)
        .map_err(|error| format!("invalid Steam Workshop metadata response: {error}"))?;

    let mut metadata = HashMap::new();
    for detail in envelope.response.publishedfiledetails {
        if detail.result != 1 || detail.publishedfileid.trim().is_empty() {
            continue;
        }

        let title = detail.title.trim();
        if title.is_empty() {
            continue;
        }

        metadata.insert(
            detail.publishedfileid,
            WorkshopMetadata {
                title: title.to_string(),
                creator: detail.creator.as_ref().and_then(NumberOrString::as_text),
                preview_url: normalize_optional_text(detail.preview_url),
                description: normalize_optional_text(detail.description),
                file_size: detail.file_size.as_ref().and_then(NumberOrString::as_u64),
                time_updated: detail.time_updated,
            },
        );
    }

    Ok(metadata)
}

pub async fn fetch_published_file_details(
    client: &reqwest::Client,
    workshop_ids: &[String],
) -> Result<HashMap<String, WorkshopMetadata>, String> {
    if workshop_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let mut body = format!("itemcount={}", workshop_ids.len());
    for (index, workshop_id) in workshop_ids.iter().enumerate() {
        let workshop_id = workshop_id.trim();
        if workshop_id.parse::<u64>().is_err() {
            return Err(format!("invalid Workshop ID {workshop_id}"));
        }
        body.push_str(&format!("&publishedfileids%5B{index}%5D={workshop_id}"));
    }

    let response = client
        .post(PUBLISHED_FILE_DETAILS_URL)
        .header(
            reqwest::header::CONTENT_TYPE,
            "application/x-www-form-urlencoded",
        )
        .body(body)
        .send()
        .await
        .map_err(|error| format!("failed to request Steam Workshop metadata: {error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "Steam Workshop metadata request failed with HTTP {}",
            response.status()
        ));
    }

    let body = response
        .text()
        .await
        .map_err(|error| format!("failed to read Steam Workshop metadata response: {error}"))?;
    parse_published_file_details(&body)
}
