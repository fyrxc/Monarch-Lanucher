# Monarch Lanucher — Next.js + Rust Rewrite Design

Date: 2026-08-28
Branch: `rewrite/nextjs-rust`

## Goal

Rebuild Monarch Lanucher from scratch using **Next.js for the frontend** and **Rust for the backend**, with Tauri 2 providing the Windows desktop shell and native bridge. The previous C#/WPF implementation is not part of the new codebase.

The launcher should open as a polished Windows desktop app, automatically show public DayZ servers without requiring users to manually query IPs, support DZSA-style filtering, persist favorites/recent servers, manage DayZ identity/settings, discover and synchronize Steam Workshop mods, launch DayZ with the correct arguments, and ship through a normal Windows installer/update flow.

## Architecture

```text
Next.js UI
   |
   | Tauri invoke/events
   v
Rust backend
   |
   +-- DayZ server directory
   +-- Steam discovery
   +-- Workshop mod discovery/sync
   +-- DayZ launch
   +-- settings/favorites/recent
   +-- updater/install integration
   +-- logging/error reporting
```

### Frontend

The frontend is a static Next.js application embedded into the Tauri desktop bundle. It owns presentation, navigation, filter state, loading states, toasts, dialogs, and user interactions. It must not directly access Windows registry, Steam files, local Workshop directories, or start DayZ processes.

Recommended frontend stack:
- Next.js with App Router
- TypeScript
- React
- Tailwind CSS or CSS modules for styling
- Tauri JavaScript API for invoking Rust commands and listening to backend progress events

The frontend will be exported as static assets for Tauri rather than running a production Node.js web server inside the desktop application.

### Rust backend

Rust owns all native/system behavior. The backend is split into focused modules rather than one large `main.rs`.

Initial module boundaries:
- `servers`: public DayZ server discovery and mapping
- `steam`: Steam executable/library discovery
- `workshop`: installed mod discovery and missing-mod synchronization
- `launcher`: DayZ launch argument construction and process start
- `settings`: local user configuration
- `collections`: favorites and recent servers
- `logging`: local logs and structured errors
- `updates`: application update integration

Tauri commands are intentionally thin wrappers over these modules.

## Project Layout

The new repository layout will use the repo root rather than nesting the app under the old `MonarchLauncher/` C# folder.

```text
/
  app/                     # Next.js App Router pages/layouts
  components/              # reusable UI components
  lib/                     # frontend state/types/Tauri client wrappers
  public/                  # static images and branding
  src-tauri/
    src/
      main.rs
      lib.rs
      commands/
      servers/
      steam/
      workshop/
      launcher/
      settings/
      collections/
      logging/
      updates/
    icons/
    Cargo.toml
    tauri.conf.json
  tests/                   # frontend tests where useful
  docs/
  package.json
  next.config.*
  tsconfig.json
  .github/workflows/
```

The old C#/WPF source will not be copied into this new architecture.

## Core User Experience

### Main layout

The app launches directly into **Servers**. There is no large dashboard/home page.

Left navigation:
- Servers
- Favorites
- Recent
- Mods
- Settings

Top-left branding is compact and clean: Monarch logo, launcher name, and no duplicated title treatment.

The window and major panels use rounded corners with a dark charcoal/gray visual style, white/gray text, thin borders, and restrained accent use.

## Server Directory

The launcher automatically loads public DayZ servers when the Servers page opens. Users do not need to enter an IP or manually request an individual server.

The backend maps each server into a stable shared model containing at minimum:
- unique ID
- server name
- IP
- game port
- query port when available
- map
- current players
- max players
- ping when available
- password status
- first-person status
- official/community classification when available
- modded status
- required Workshop mod IDs when available
- country/status metadata when available

No fake/sample production servers are allowed. If discovery fails, the UI shows a real error state and retry action.

### Server source strategy

The implementation should prefer a reliable public DayZ directory/API that can return many servers automatically. The server provider is hidden behind a Rust trait/interface so the source can be replaced later without rewriting the UI.

The directory implementation must:
- fetch the public list automatically
- normalize malformed/missing fields safely
- deduplicate servers
- support cancellation/timeouts
- return partial data with a warning when possible rather than throwing away all valid rows

## Server Filters

The Servers page supports DZSA-style client-side filtering after the directory is loaded.

Initial filters:
- text search by name/map/address
- map
- minimum players
- maximum players
- maximum ping
- hide empty
- hide full
- modded / vanilla / either
- passworded / unpassworded / either
- official / community / either
- first-person-only / third-person-allowed / either
- favorites only

Filters update the displayed rows immediately without re-querying a specific server.

## Favorites and Recent

Favorites and recent servers persist locally through the Rust backend.

Favorites:
- star/unstar directly from the Servers page
- dedicated Favorites page
- remove favorite
- join directly

Recent:
- successful joins are added automatically
- newest first
- duplicate server entries collapse to the newest occurrence
- bounded history size
- clear history action
- join directly

Persistent app data is stored under the user's local application-data directory, not next to the executable.

## DayZ Name and Settings

Settings includes at minimum:
- DayZ name / profile name
- optional DayZ launch parameters
- detected Steam path
- detected DayZ installation path/status
- update channel/version information

The saved DayZ name is applied when launching DayZ.

Rust validates and escapes launch arguments rather than trusting raw frontend strings.

## Steam and DayZ Discovery

Rust detects Steam using Windows registry entries first, then common fallback locations.

It detects Steam libraries from `libraryfolders.vdf`, including non-default drives.

The backend should be able to determine:
- Steam executable path
- Steam library roots
- DayZ installation presence
- DayZ Workshop content roots

Failure states must be surfaced as readable launcher errors such as “Steam was not found” or “DayZ is not installed.”

## Mods Page

The Mods page lists installed DayZ Workshop mods discovered across Steam libraries.

Each row shows:
- display name when available
- Workshop ID
- local path
- installed state

The page supports search and refresh.

The backend reads metadata defensively; a broken mod folder must not crash the page.

## Server Mod Synchronization

When joining a modded server, the launcher resolves the server's required Steam Workshop IDs.

Flow:
1. Receive required Workshop IDs from the normalized server model/provider.
2. Scan installed DayZ Workshop content.
3. Split required mods into installed and missing sets.
4. If none are missing, continue directly to launch.
5. If mods are missing, show the list in the UI and start Steam Workshop acquisition through the Rust backend.
6. Emit progress/status events to the Next.js frontend.
7. Re-scan/verify required Workshop directories before launching.
8. Launch DayZ only after required mods are confirmed present, unless the user explicitly cancels.

The launcher should use Steam-supported mechanisms rather than implementing its own Workshop file downloader.

If a provider cannot supply exact Workshop IDs for a server, the launcher must clearly state that automatic mod synchronization is unavailable for that server rather than pretending sync completed.

## DayZ Launch

Rust constructs and starts the DayZ/Steam launch command.

Launch data can include:
- server IP and port
- saved DayZ name
- required mod paths/IDs as supported by the launch mechanism
- user-approved extra launch parameters

The launcher records a server in Recent only after the launch process is started successfully.

Launch failures return structured errors to the frontend.

## Frontend/Rust Contract

The frontend calls small Tauri commands instead of handling native work itself.

Expected commands include:
- `get_servers`
- `get_favorites`
- `toggle_favorite`
- `get_recent`
- `clear_recent`
- `get_installed_mods`
- `get_settings`
- `save_settings`
- `get_system_status`
- `prepare_server_join`
- `sync_server_mods`
- `launch_server`

Long-running operations such as server refresh and mod sync can emit Tauri events such as:
- `server-directory-status`
- `mod-sync-status`
- `mod-sync-progress`

All payloads use explicit serializable Rust/TypeScript models so the contract stays stable.

## Error Handling and Logging

The launcher must never silently open and immediately close without leaving evidence.

Rust initializes local logging before the main window performs native operations. Logs are stored under the app's local data directory.

The frontend receives user-safe error messages while the log contains technical details.

Error categories include:
- server directory/network failure
- invalid server data
- Steam missing
- DayZ missing
- Workshop sync failure
- settings read/write failure
- launch failure
- updater failure

The Settings page includes an “Open Logs Folder” action.

## App Icon and Branding

The Monarch crown/logo will be used for:
- Tauri window icon
- packaged EXE icon
- taskbar icon
- installer icon
- shortcut icon

Tauri icon assets will be generated into `src-tauri/icons/` from the approved Monarch source artwork.

## Windows Packaging

The shipping experience is installer-first, not a loose folder of DLLs/files in Downloads.

Primary release asset:

```text
MonarchLanucher-Setup.exe
```

The app installs per-user under a LocalAppData Programs location, creates Start Menu/Desktop shortcuts as configured, and has a normal uninstall entry.

Tauri's Windows bundling path will be used as the baseline. The exact installer target (NSIS or WiX/MSI) will be selected during implementation based on the best fit for a single `.exe` setup file; preference is NSIS if it meets all updater requirements.

## Updates

GitHub Releases remains the release source.

The new update path must be compatible with the installed Tauri application rather than the old custom C# ZIP replacement updater.

Target behavior:
1. app checks the latest signed/approved release metadata
2. UI shows update availability
3. user starts update
4. update downloads and installs
5. app restarts into the new version

GitHub Actions creates release artifacts automatically from `main` after verification.

## CI / GitHub Actions

The rewritten workflow runs on Windows and performs at minimum:
- install Node.js
- install frontend dependencies from lockfile
- frontend typecheck/lint/tests
- install Rust stable toolchain
- Rust format check
- Rust clippy
- Rust tests
- Next.js static build/export
- Tauri Windows build
- installer artifact creation

Branch pushes run verification only. Releases are created only from the release/main path, avoiding accidental releases while feature work is still being developed.

## Testing Strategy

### Rust

Unit tests cover:
- server response mapping
- server deduplication/filter-support fields
- settings persistence
- favorites/recent persistence
- Steam library parsing
- Workshop installed-mod detection
- required-vs-missing mod calculation
- launch argument construction/escaping

Native process starts and registry/filesystem integration are wrapped so tests can use fixtures/fakes.

### Frontend

Frontend tests cover key state behavior rather than duplicating browser implementation details:
- filter state
- server row rendering from normalized models
- favorite/recent actions
- settings form state
- mod sync status states
- error/empty/loading states

### CI gate

A branch is not considered ready for merge until frontend tests, Rust tests, and the Tauri Windows build pass in GitHub Actions.

## Implementation Phases

### Phase 1 — Core launcher

Deliver:
- fresh Next.js + Tauri + Rust project
- polished server-first shell
- automatic public DayZ directory
- server search and filters
- favorites
- recent
- DayZ name/settings
- direct server join
- local logging

### Phase 2 — Workshop integration

Deliver:
- installed-mod discovery
- server-required Workshop IDs in the shared server model
- missing-mod calculation
- Steam Workshop synchronization workflow
- progress UI
- verify-before-launch behavior

### Phase 3 — Distribution

Deliver:
- final Monarch icons
- single Windows setup EXE
- installed app shortcuts/uninstall flow
- GitHub release/update integration
- release workflow hardening

## Explicit Non-Goals for the Initial Rewrite

To keep the rewrite focused, the first implementation will not include:
- user accounts/login system
- custom cloud backend controlled by Monarch
- paid/VIP systems
- fake/sample server rows in production
- Linux/macOS packaging
- arbitrary in-app Workshop downloads outside Steam-supported mechanisms

These can be designed separately later if needed.

## Migration Rule

The new branch is a clean rewrite. Existing C#/WPF files are not copied into the new application architecture. The old implementation remains only in Git history/older branches until the new Tauri build is verified and deliberately merged/replaces `main`.
