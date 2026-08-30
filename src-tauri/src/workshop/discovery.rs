use crate::models::InstalledMod;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

const DAYZ_APP_ID: &str = "221100";

pub fn discover_from_roots(roots: &[PathBuf]) -> Result<Vec<InstalledMod>, String> {
    let mut installed = Vec::new();
    let mut seen = HashSet::new();

    for root in roots {
        let content_root = root
            .join("steamapps")
            .join("workshop")
            .join("content")
            .join(DAYZ_APP_ID);

        let Ok(entries) = fs::read_dir(&content_root) else {
            continue;
        };

        for entry in entries.flatten() {
            let Ok(file_type) = entry.file_type() else {
                continue;
            };
            if !file_type.is_dir() {
                continue;
            }

            let file_name = entry.file_name();
            let workshop_id = file_name.to_string_lossy().into_owned();
            let Ok(numeric_id) = workshop_id.parse::<u64>() else {
                continue;
            };
            if numeric_id == 0 || !seen.insert(workshop_id.clone()) {
                continue;
            }

            let path = entry.path();
            let name = read_mod_name(&path).unwrap_or_else(|| format!("Workshop {workshop_id}"));

            installed.push(InstalledMod {
                workshop_id,
                name,
                path: path.to_string_lossy().into_owned(),
            });
        }
    }

    installed.sort_by_key(|item| item.workshop_id.parse::<u64>().unwrap_or(u64::MAX));
    Ok(installed)
}

fn read_mod_name(path: &Path) -> Option<String> {
    for file_name in ["meta.cpp", "mod.cpp"] {
        let Ok(body) = fs::read_to_string(path.join(file_name)) else {
            continue;
        };
        if let Some(name) = parse_name(&body) {
            return Some(name);
        }
    }
    None
}

fn parse_name(body: &str) -> Option<String> {
    body.lines().find_map(|line| {
        let trimmed = line.trim();
        let (key, value) = trimmed.split_once('=')?;
        if !key.trim().eq_ignore_ascii_case("name") {
            return None;
        }

        let value = value.trim();
        let start = value.find('"')? + 1;
        let rest = &value[start..];
        let end = rest.find('"')?;
        let name = rest[..end].trim();
        (!name.is_empty()).then(|| name.to_string())
    })
}
