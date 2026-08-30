# Monarch Lanucher — Server Directory, UI, Settings, Icon, and Installer Design

Date: 2026-08-28

## Goal

Turn the current working WPF prototype into a cleaner DZSA-style launcher that automatically shows public DayZ servers, does not require users to manually add/query a server, supports useful server filters, saves a DayZ player name, uses Monarch branding consistently, and is distributed as one installer EXE instead of a loose folder of files.

## Server Directory Architecture

The launcher will stop depending on the legacy Steam master hostname as its primary discovery path. Instead, `IServerDirectoryService` will use a public indexed DayZ server directory provider and page through the provider automatically.

The user experience is:

1. Open Monarch Lanucher.
2. Servers begin loading automatically.
3. The launcher fetches multiple pages in the background.
4. Rows appear as data arrives.
5. Search and filter are applied locally to the loaded directory.
6. The user never types an IP or manually queries a server to discover it.

The directory provider will represent all publicly indexed/queryable DayZ servers available from the upstream index. Private/offline/unqueryable servers that no public index can see are outside the meaning of “all servers.”

BattleMetrics is the preferred first provider because its public DayZ directory already indexes queryable servers automatically and exposes the same categories needed for a DZSA-style browser: player count, status, modded state, official state, password state, third-person state, search, and location-related information. The provider will be wrapped behind `IServerDirectoryService` so the source can be replaced later without rewriting the UI.

For selected rows, the launcher may still use direct A2S querying as a secondary detail/ping refresh when useful, but direct querying will not be required to discover servers.

## Server Browser UI

The Servers page remains the launcher’s primary page. The layout will be denser and cleaner than the current build.

Top area:
- one compact Monarch brand area, not duplicated logos
- search box
- Refresh button
- Filters button / expandable filter panel
- current server count and loading status

Server table columns:
- favorite
- server name
- map
- players
- ping/distance when available
- modded indicator
- official/community indicator
- address hidden from the main visual emphasis but available in details
- Join action

Filters:
- search text
- map
- minimum players
- maximum players
- hide empty
- hide full
- maximum ping/distance where available
- modded / unmodded / either
- passworded / non-passworded / either
- official / community / either
- first-person / third-person / either when available
- favorites only

Filters will not require a new network request unless the provider supports and benefits from server-side filtering. The main UX should feel immediate once data has loaded.

## UI Cleanup

The visual direction remains gray/white Monarch styling, but with less empty space and less template-like framing.

Changes:
- clean top-left header so the Monarch logo appears once and at the correct scale
- reduce oversized blank header areas
- round the main window corners
- round panels, buttons, search fields, and filter controls consistently
- improve selected navigation styling
- make server rows more compact
- improve spacing and hierarchy
- keep the title bar minimal
- preserve the existing dark charcoal palette

Window rounding will use WPF-compatible border/window treatment without breaking resize behavior.

## DayZ Player Name

Settings will include a saved `DayZ Name` field.

The value will be stored in launcher user settings under the user profile, not in the application install directory. When launching DayZ, the launcher will pass/apply the saved profile name using the supported DayZ launch/config mechanism.

Settings will also remain the home for future DayZ path, Steam path, and launch-parameter options.

## Monarch App Icon

The supplied Monarch crown mark will be converted into a Windows `.ico` asset with multiple icon sizes.

It will be applied to:
- the WPF window
- taskbar
- executable
- installer
- Start Menu shortcut
- desktop shortcut if the user selects one

The existing full Monarch wordmark remains for in-app branding; the crown-only mark is the app icon.

## Distribution / Installer

The launcher will no longer be distributed to users as a ZIP containing many visible files.

GitHub Actions will produce one primary download:

`MonarchLanucher-Setup.exe`

The installer will perform a per-user install, similar to modern desktop apps, under:

`%LOCALAPPDATA%\Programs\Monarch Lanucher\`

This avoids requiring administrator rights and keeps the internal DLL/config/updater files out of the user’s normal Downloads/Desktop workflow.

The installer will:
- install all launcher runtime files into the app directory
- create a Start Menu shortcut
- optionally create a desktop shortcut
- register an uninstaller
- use the Monarch icon
- launch Monarch Lanucher after installation if selected

GitHub Releases will expose the installer as the main asset. A portable ZIP may remain available only for debugging/development, but normal users should download the single setup EXE.

The existing GitHub update mechanism will continue to update the installed application in place. Updates will target the same LocalAppData Programs directory and should not require the user to reinstall manually.

## GitHub Release Flow

On each accepted change to `main`:

1. GitHub Actions restores and tests the solution.
2. It publishes the launcher and updater.
3. It packages the internal runtime payload.
4. It builds `MonarchLanucher-Setup.exe`.
5. It creates the next automatic versioned GitHub Release.
6. The launcher’s Check for Updates button sees that release and installs the update.

The release workflow must fail loudly if tests, publish, packaging, or installer generation fails. It must not publish a broken release.

## Error Handling

Server directory failures must not crash or close the app. The server page should show a clear inline error and keep Refresh available.

If one directory page fails after earlier pages have loaded, already loaded rows stay visible and the status reports a partial-load problem.

If the public provider is unavailable, the launcher should report that the directory service is unavailable instead of showing fake rows.

Launcher startup failures should be logged to a local log file so “opens then closes” type failures can be diagnosed without needing a debugger.

## Testing

Tests will cover:
- mapping server-directory API responses into `DayZServer`
- pagination behavior
- filtering behavior
- search behavior
- player-name persistence
- launch argument generation using the saved DayZ name
- update/version parsing
- installer/release workflow path and asset-name assumptions where practical

The GitHub Actions workflow remains the authoritative Windows build verification because WPF execution is Windows-specific.

## Non-goals for this implementation

This iteration does not implement full DZSA-equivalent Workshop dependency syncing yet. The Mods page can remain a foundation until server mod discovery/download/update is implemented in a later subsystem.

The launcher will not fabricate or hard-code sample servers in production.
