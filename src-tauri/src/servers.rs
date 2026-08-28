use crate::models::DayzServer;
use serde::Deserialize;
use serde_json::Value;
use std::collections::HashSet;

#[derive(Debug, Deserialize)]
struct DirectoryResponse {
    status: i64,
    #[serde(default)]
    result: Vec<RawServer>,
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
    port: u16,
}

#[derive(Debug, Deserialize)]
struct RawMod {
    #[serde(rename = "steamWorkshopId")]
    steam_workshop_id: Option<Value>,
}

pub fn parse_directory_json(json: &str) -> Result<Vec<DayzServer>, String> {
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

    for raw in response.result {
        let Some(server) = map_server(raw) else {
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

    Ok(servers)
}

fn map_server(raw: RawServer) -> Option<DayzServer> {
    let name = raw.name?.trim().to_string();
    if name.is_empty() {
        return None;
    }

    let endpoint = raw.endpoint?;
    let ip = endpoint.ip.trim().to_string();
    if ip.is_empty() || endpoint.port == 0 {
        return None;
    }

    let game_port = raw.game_port?;
    if game_port == 0 {
        return None;
    }

    let id = value_to_string(raw.id.as_ref())
        .unwrap_or_else(|| format!("{ip}:{game_port}:{}", endpoint.port));

    let required_workshop_ids = raw
        .mods
        .iter()
        .filter_map(|item| value_to_string(item.steam_workshop_id.as_ref()))
        .collect();

    Some(DayzServer {
        id,
        name,
        map: raw
            .map
            .filter(|map| !map.trim().is_empty())
            .unwrap_or_else(|| "Unknown".to_string()),
        players: raw.players.unwrap_or(0),
        capacity: raw.max_players.unwrap_or(0),
        ping: raw.ping,
        ip,
        game_port,
        query_port: endpoint.port,
        status: raw.status.unwrap_or_else(|| "online".to_string()),
        is_passworded: raw.password.unwrap_or(false),
        is_official: raw.official.unwrap_or(false),
        first_person_only: raw.first_person_only.unwrap_or(false),
        country: raw.country.unwrap_or_default(),
        required_workshop_ids,
    })
}

fn value_to_string(value: Option<&Value>) -> Option<String> {
    match value? {
        Value::String(value) if !value.trim().is_empty() => Some(value.clone()),
        Value::Number(value) => value.as_u64().map(|number| number.to_string()),
        _ => None,
    }
}
