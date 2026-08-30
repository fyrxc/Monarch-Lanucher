use crate::models::{DayzServer, InstalledMod, LauncherSettings};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DayzLaunchCommand {
    pub executable: PathBuf,
    pub working_directory: PathBuf,
    pub args: Vec<String>,
}

pub fn build_launch_args(
    server: &DayzServer,
    settings: &LauncherSettings,
) -> Result<Vec<String>, String> {
    build_launch_args_with_mods(server, settings, &[])
}

pub fn build_launch_args_with_mods(
    server: &DayzServer,
    settings: &LauncherSettings,
    installed_mods: &[InstalledMod],
) -> Result<Vec<String>, String> {
    let mut args = vec!["-applaunch".to_string(), "221100".to_string()];
    args.extend(build_dayz_args_with_mods(server, settings, installed_mods)?);
    Ok(args)
}

pub fn build_dayz_launch_command(
    server: &DayzServer,
    settings: &LauncherSettings,
    installed_mods: &[InstalledMod],
    dayz_root: &Path,
) -> Result<DayzLaunchCommand, String> {
    build_dayz_launch_command_with_password(server, settings, installed_mods, dayz_root, None)
}

pub fn build_dayz_launch_command_with_password(
    server: &DayzServer,
    settings: &LauncherSettings,
    installed_mods: &[InstalledMod],
    dayz_root: &Path,
    password: Option<&str>,
) -> Result<DayzLaunchCommand, String> {
    let mut dayz_args = build_dayz_args_with_mods(server, settings, installed_mods)?;

    if let Some(password) = password {
        if contains_control_characters(password) {
            return Err("invalid server password: control characters are not allowed".to_string());
        }
        if !password.is_empty() {
            dayz_args.push(format!("-password={password}"));
        }
    }

    if settings.skip_battleye {
        return Ok(DayzLaunchCommand {
            executable: dayz_root.join("DayZ_x64.exe"),
            working_directory: dayz_root.to_path_buf(),
            args: dayz_args,
        });
    }

    let mut args = vec![
        "0".to_string(),
        "1".to_string(),
        "1".to_string(),
        "-exe".to_string(),
        "DayZ_x64.exe".to_string(),
    ];
    args.extend(dayz_args);

    Ok(DayzLaunchCommand {
        executable: dayz_root.join("DayZ_BE.exe"),
        working_directory: dayz_root.to_path_buf(),
        args,
    })
}

fn build_dayz_args_with_mods(
    server: &DayzServer,
    settings: &LauncherSettings,
    installed_mods: &[InstalledMod],
) -> Result<Vec<String>, String> {
    let mut args = vec![
        format!("-connect={}", server.ip),
        format!("-port={}", server.game_port),
    ];

    let player_name = settings.dayz_name.trim();
    if !player_name.is_empty() {
        if contains_control_characters(player_name) {
            return Err("invalid DayZ player name".to_string());
        }
        args.push(format!("-name={player_name}"));
    }

    if !server.required_workshop_ids.is_empty() {
        let installed_by_id: HashMap<&str, &InstalledMod> = installed_mods
            .iter()
            .map(|item| (item.workshop_id.as_str(), item))
            .collect();
        let mut mod_paths = Vec::with_capacity(server.required_workshop_ids.len());

        for workshop_id in &server.required_workshop_ids {
            let item = installed_by_id
                .get(workshop_id.as_str())
                .ok_or_else(|| format!("required Workshop mod {workshop_id} is not installed"))?;
            let path = item.path.trim();
            if path.is_empty() || contains_control_characters(path) || path.contains(';') {
                return Err(format!("invalid path for Workshop mod {workshop_id}"));
            }
            mod_paths.push(path);
        }

        args.push(format!("-mod={}", mod_paths.join(";")));
    }

    args.extend(parse_extra_parameters(&settings.extra_launch_parameters)?);
    Ok(args)
}

fn parse_extra_parameters(input: &str) -> Result<Vec<String>, String> {
    if contains_control_characters(input) {
        return Err("invalid launch parameters: control characters are not allowed".to_string());
    }

    let mut args = Vec::new();
    let mut current = String::new();
    let mut chars = input.chars().peekable();
    let mut quoted = false;

    while let Some(ch) = chars.next() {
        match ch {
            '"' => quoted = !quoted,
            '\\' if chars.peek() == Some(&'"') => {
                chars.next();
                current.push('"');
            }
            ch if ch.is_whitespace() && !quoted => {
                if !current.is_empty() {
                    args.push(std::mem::take(&mut current));
                }
            }
            _ => current.push(ch),
        }
    }

    if quoted {
        return Err("invalid launch parameters: unclosed quote".to_string());
    }

    if !current.is_empty() {
        args.push(current);
    }

    Ok(args)
}

fn contains_control_characters(value: &str) -> bool {
    value.contains('\0') || value.contains('\r') || value.contains('\n')
}
