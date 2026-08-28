use crate::models::{DayzServer, ServerDirectoryResult};
use serde::Deserialize;
use serde_json::Value;
use std::collections::HashSet;

#[derive(Debug, Deserialize)]
struct DirectoryResponse {
    status: i64,
    #[serde(default)]
    result: Vec<Value>,
}

#[derive(Debug, Deserialize)]
struct RawServer {
    id: Option<Value>,
    name: Option<String>,
    players: Option<u32>,
    #[serde(rename = "maxPlayers")]
    max_players: Option<u32>,
    map: Option<String>,
    password: Option<bool>,
    official: Option<bool>,
    #[serde(rename = "firstPersonOnly")]
    first_person_only: Option<bool>,
    country: Option<String>,
    ping: Option<u32>,
    status: Option<String>,
    #[serde(default)]
    mods: Vec<RawMod>,
    endpoint: Option<RawEndpoint>,
    #[serde(rename = "gamePort")]
    game_port: Option<u16>,
}

#[derive(Debug, Deserialize)]
struct RawEndpoint {
    ip: String,
    port: Option<u16>,
}

#[derive(Debug, Deserialize)]
struct RawMod {
    #[serde(rename = "steamWorkshopId")]
    steam_workshop_id: Option<Value>,
}

pub fn parse_directory(json: &str) -> Result<ServerDirectoryResult, String> {
    let response: DirectoryResponse = serde_json::from_str(json)
        .map_err(|error| format!("invalid server directory response: {error}"))?;

    if response.status != 0 {
        return Err(format!(
            "server directory provider returned status {}",
            response.status
        ));
    }

    let mut seen = HashSet::new();
    let mut servers = Vec::new();
    let mut skipped_rows = 0usize;

    for value in response.result {
        let raw = match serde_json::from_value::<RawServer>(value) {
            Ok(raw) => raw,
            Err(_) => {
                skipped_rows += 1;
                continue;
            }
        };

        let Some(server) = map_server(raw) else {
            skipped_rows += 1;
            continue;
        };

        if seen.insert(server.id.clone()) {
            servers.push(server);
        }
    }

    servers.sort_by(|left, right| {
        right
            .players
            .cmp(&left.players)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });

    let warning = if skipped_rows == 0 {
        None
    } else if skipped_rows == 1 {
        Some("1 malformed server row was skipped.".to_string())
    } else {
        Some(format!(
            "{skipped_rows} malformed server rows were skipped."
        ))
    };

    Ok(ServerDirectoryResult {
        servers,
        is_partial: skipped_rows > 0,
        warning,
    })
}

pub fn parse_directory_json(json: &str) -> Result<Vec<DayzServer>, String> {
    parse_directory(json).map(|result| result.servers)
}

fn map_server(raw: RawServer) -> Option<DayzServer> {
    let name = raw.name?.trim().to_string();
    if name.is_empty() {
        return None;
    }

    let endpoint = raw.endpoint?;
    let ip = endpoint.ip.trim().to_string();
    if ip.is_empty() {
        return None;
    }

    let game_port = raw.game_port?;
    if game_port == 0 {
        return None;
    }

    let query_port = endpoint
        .port
        .filter(|port| *port > 0)
        .unwrap_or_else(|| game_port.checked_add(1).unwrap_or(game_port));

    let id = value_to_id(raw.id.as_ref()).unwrap_or_else(|| format!("{ip}:{game_port}"));
    let required_workshop_ids = collect_workshop_ids(&raw.mods);

    Some(DayzServer {
        id,
        name,
        map: raw
            .map
            .map(|map| map.trim().to_string())
            .filter(|map| !map.is_empty())
            .unwrap_or_else(|| "DayZ".to_string()),
        players: raw.players.unwrap_or(0),
        capacity: raw.max_players.unwrap_or(0),
        ping: raw.ping,
        ip,
        game_port,
        query_port,
        status: raw
            .status
            .map(|status| status.trim().to_string())
            .filter(|status| !status.is_empty())
            .unwrap_or_else(|| "online".to_string()),
        is_passworded: raw.password.unwrap_or(false),
        is_official: raw.official.unwrap_or(false),
        first_person_only: raw.first_person_only.unwrap_or(false),
        country: raw.country.unwrap_or_default(),
        required_workshop_ids,
    })
}

fn collect_workshop_ids(mods: &[RawMod]) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut ids = Vec::new();

    for item in mods {
        let Some(id) = value_to_workshop_id(item.steam_workshop_id.as_ref()) else {
            continue;
        };

        if seen.insert(id.clone()) {
            ids.push(id);
        }
    }

    ids
}

fn value_to_id(value: Option<&Value>) -> Option<String> {
    match value? {
        Value::String(value) if !value.trim().is_empty() => Some(value.trim().to_string()),
        Value::Number(value) => value.as_u64().map(|number| number.to_string()),
        _ => None,
    }
}

fn value_to_workshop_id(value: Option<&Value>) -> Option<String> {
    let number = match value? {
        Value::String(value) => value.trim().parse::<u64>().ok()?,
        Value::Number(value) => value.as_u64()?,
        _ => return None,
    };

    (number > 0).then(|| number.to_string())
}
