use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

const DAYZ_PROCESSES: [&str; 3] = ["DayZ_x64.exe", "DayZ_BE.exe", "DayZLauncher.exe"];

pub fn tasklist_contains_dayz(output: &str) -> bool {
    let lower = output.to_ascii_lowercase();
    DAYZ_PROCESSES
        .iter()
        .any(|name| lower.contains(&name.to_ascii_lowercase()))
}

pub fn tasklist_contains_steam(output: &str) -> bool {
    output.lines().any(|line| {
        line.trim_start()
            .to_ascii_lowercase()
            .starts_with("\"steam.exe\"")
    })
}

fn tasklist_output() -> Result<String, String> {
    let mut command = Command::new("tasklist");
    command.args(["/NH", "/FO", "CSV"]);
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    let output = command
        .output()
        .map_err(|error| format!("failed to check running processes: {error}"))?;

    if !output.status.success() {
        return Err(format!(
            "Windows tasklist failed while checking processes: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

pub fn is_steam_running() -> Result<bool, String> {
    Ok(tasklist_contains_steam(&tasklist_output()?))
}

pub fn is_dayz_running() -> Result<bool, String> {
    Ok(tasklist_contains_dayz(&tasklist_output()?))
}

#[tauri::command]
pub fn get_dayz_running() -> Result<bool, String> {
    is_dayz_running()
}

pub fn close_dayz_processes() -> Result<(), String> {
    let mut failures = Vec::new();

    for process in DAYZ_PROCESSES {
        let mut command = Command::new("taskkill");
        command.args(["/IM", process, "/T", "/F"]);
        #[cfg(windows)]
        command.creation_flags(CREATE_NO_WINDOW);
        let output = command
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
