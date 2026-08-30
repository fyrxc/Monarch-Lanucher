use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use std::fs;
use std::path::{Path, PathBuf};

fn main() {
    let icon_path = Path::new("icons/icon.ico");
    if !icon_path.exists() {
        fs::create_dir_all("icons").expect("failed to create Tauri icon directory");
        let encoded =
            fs::read_to_string("icons/icon.ico.b64").expect("failed to read embedded Monarch icon");
        let bytes = STANDARD
            .decode(encoded.trim())
            .expect("failed to decode embedded Monarch icon");
        fs::write(icon_path, bytes).expect("failed to write Tauri Windows icon");
    }

    #[cfg(windows)]
    stage_steam_api_runtime();

    tauri_build::build()
}

#[cfg(windows)]
fn stage_steam_api_runtime() {
    let source =
        find_steam_api_runtime().expect("failed to locate steam_api64.dll from steamworks-sys");
    let manifest_dir = PathBuf::from(
        std::env::var_os("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is not available"),
    );
    let profile = std::env::var("PROFILE").unwrap_or_else(|_| "debug".to_string());
    let target_root = std::env::var_os("CARGO_TARGET_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| manifest_dir.join("target"));
    let profile_dir = target_root.join(profile);
    let deps_dir = profile_dir.join("deps");

    fs::create_dir_all(&deps_dir).expect("failed to create Cargo deps directory");
    fs::copy(&source, manifest_dir.join("steam_api64.dll"))
        .expect("failed to stage steam_api64.dll for Tauri bundling");
    fs::copy(&source, profile_dir.join("steam_api64.dll"))
        .expect("failed to stage steam_api64.dll beside Monarch executable");
    fs::copy(&source, deps_dir.join("steam_api64.dll"))
        .expect("failed to stage steam_api64.dll for Rust test binaries");

    println!("cargo:rerun-if-env-changed=CARGO_HOME");
}

#[cfg(windows)]
fn find_steam_api_runtime() -> Option<PathBuf> {
    let cargo_home = std::env::var_os("CARGO_HOME")
        .map(PathBuf::from)
        .or_else(|| {
            std::env::var_os("USERPROFILE").map(|home| PathBuf::from(home).join(".cargo"))
        })?;
    let registry_src = cargo_home.join("registry").join("src");

    for registry in fs::read_dir(registry_src).ok()?.filter_map(Result::ok) {
        let registry_path = registry.path();
        if !registry_path.is_dir() {
            continue;
        }
        for package in fs::read_dir(registry_path).ok()?.filter_map(Result::ok) {
            let package_path = package.path();
            let package_name = package.file_name();
            if !package_name
                .to_string_lossy()
                .starts_with("steamworks-sys-")
            {
                continue;
            }
            let candidate = package_path
                .join("lib")
                .join("steam")
                .join("redistributable_bin")
                .join("win64")
                .join("steam_api64.dll");
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }

    None
}
