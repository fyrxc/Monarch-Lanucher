use std::process::Command;

const DAYZ_PROCESSES: [&str; 3] = ["DayZ_x64.exe", "DayZ_BE.exe", "DayZLauncher.exe"];

pub fn tasklist_contains_dayz(output: &str) -> bool {
    let lower = output.to_ascii_lowercase();
    DAYZ_PROCESSES
        .iter()
        .any(|name| lower.contains(&name.to_ascii_lowercase()))
}

pub fn is_dayz_running() -> Result<bool, String> {
    let output = Command::new("tasklist")
        .args(["/NH", "/FO", "CSV"])
        .output()
        .map_err(|error| format!("failed to check running DayZ processes: {error}"))?;

    if !output.status.success() {
        return Err(format!(
            "Windows tasklist failed while checking DayZ: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    Ok(tasklist_contains_dayz(&String::from_utf8_lossy(&output.stdout)))
}

pub fn close_dayz_processes() -> Result<(), String> {
    let mut failures = Vec::new();

    for process in DAYZ_PROCESSES {
        let output = Command::new("taskkill")
            .args(["/IM", process, "/T", "/F"])
            .output()
            .map_err(|error| format!("failed to run taskkill for {process}: {error}"))?;

        if output.status.success() {
            continue;
        }

        let message = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let lower = message.to_ascii_lowercase();
        if lower.contains("not found") || lower.contains("no running instance") {
            continue;
        }
        if !message.is_empty() {
            failures.push(format!("{process}: {message}"));
        }
    }

    if failures.is_empty() {
        Ok(())
    } else {
        Err(format!("failed to close DayZ: {}", failures.join("; ")))
    }
}
