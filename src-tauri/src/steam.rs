use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SteamPaths {
    pub steam_exe: PathBuf,
    pub library_roots: Vec<PathBuf>,
    pub dayz_root: Option<PathBuf>,
    pub dayz_exe: Option<PathBuf>,
    pub dayz_be_exe: Option<PathBuf>,
}

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

pub fn find_dayz_install(roots: &[PathBuf]) -> (Option<PathBuf>, Option<PathBuf>, Option<PathBuf>) {
    for root in roots {
        let dayz_root = root.join("steamapps").join("common").join("DayZ");
        let dayz_exe = dayz_root.join("DayZ_x64.exe");
        if !dayz_exe.exists() {
            continue;
        }

        let dayz_be_exe = dayz_root.join("DayZ_BE.exe");
        return (
            Some(dayz_root),
            Some(dayz_exe),
            dayz_be_exe.exists().then_some(dayz_be_exe),
        );
    }

    (None, None, None)
}

pub fn discover_steam() -> Result<SteamPaths, String> {
    let registry_exe = registry_value("SteamExe").map(PathBuf::from);
    let registry_root = registry_value("SteamPath").map(PathBuf::from);
    let fallback_exe = std::env::var_os("ProgramFiles(x86)")
        .map(PathBuf::from)
        .map(|root| root.join("Steam").join("steam.exe"));

    let steam_exe = registry_exe
        .filter(|path| path.exists())
        .or_else(|| fallback_exe.filter(|path| path.exists()))
        .ok_or_else(|| "Steam is not installed".to_string())?;

    let steam_root = registry_root
        .filter(|path| path.exists())
        .or_else(|| steam_exe.parent().map(Path::to_path_buf))
        .ok_or_else(|| "Unable to determine the Steam install folder".to_string())?;

    let mut roots = vec![steam_root.clone()];
    let library_file = steam_root.join("steamapps").join("libraryfolders.vdf");
    if let Ok(body) = fs::read_to_string(library_file) {
        if let Ok(additional) = parse_libraryfolders(&body) {
            roots.extend(additional);
        }
    }
    dedupe_paths(&mut roots);

    let (dayz_root, dayz_exe, dayz_be_exe) = find_dayz_install(&roots);

    Ok(SteamPaths {
        steam_exe,
        library_roots: roots,
        dayz_root,
        dayz_exe,
        dayz_be_exe,
    })
}

pub fn is_steam_running() -> bool {
    #[cfg(windows)]
    {
        let mut command = Command::new("tasklist");
        command.args(["/FI", "IMAGENAME eq steam.exe", "/NH"]);
        configure_hidden_command(&mut command);
        return command
            .output()
            .ok()
            .map(|output| String::from_utf8_lossy(&output.stdout).to_ascii_lowercase())
            .is_some_and(|body| {
                body.lines()
                    .any(|line| line.trim_start().starts_with("steam.exe"))
            });
    }

    #[cfg(not(windows))]
    false
}

pub fn configure_hidden_command(command: &mut Command) {
    #[cfg(windows)]
    {
        command.creation_flags(CREATE_NO_WINDOW);
    }

    #[cfg(not(windows))]
    {
        let _ = command;
    }
}

fn dedupe_paths(paths: &mut Vec<PathBuf>) {
    let mut seen = HashSet::new();
    paths.retain(|path| seen.insert(path.to_string_lossy().to_ascii_lowercase()));
}

#[cfg(windows)]
fn registry_value(name: &str) -> Option<String> {
    let mut command = Command::new("reg");
    command.args(["query", r"HKCU\Software\Valve\Steam", "/v", name]);
    configure_hidden_command(&mut command);
    let output = command.output().ok()?;
    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout.lines().find_map(|line| {
        if !line.contains(name) || !line.contains("REG_SZ") {
            return None;
        }
        line.split_once("REG_SZ")
            .map(|(_, value)| value.trim().trim_matches('"').to_string())
            .filter(|value| !value.is_empty())
    })
}

#[cfg(not(windows))]
fn registry_value(_name: &str) -> Option<String> {
    None
}
