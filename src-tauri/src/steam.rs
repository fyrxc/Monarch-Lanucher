use std::collections::HashSet;
use std::path::PathBuf;

pub fn parse_libraryfolders(body: &str) -> Result<Vec<PathBuf>, String> {
    let mut roots = Vec::new();
    let mut seen = HashSet::new();

    for line in body.lines() {
        let trimmed = line.trim();
        if !trimmed.starts_with("\"path\"") {
            continue;
        }

        let parts: Vec<&str> = trimmed.split('"').collect();
        let Some(raw_path) = parts.get(3) else {
            continue;
        };

        let normalized = raw_path.replace("\\\\", "\\").trim().to_string();
        if normalized.is_empty() {
            continue;
        }

        let identity = normalized.to_ascii_lowercase();
        if seen.insert(identity) {
            roots.push(PathBuf::from(normalized));
        }
    }

    if roots.is_empty() {
        return Err("Steam libraryfolders.vdf did not contain any library paths".to_string());
    }

    Ok(roots)
}
