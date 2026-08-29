# Monarch Launcher — Figma + DZSA-style Overhaul Design

Date: 2026-08-29
Branch: `feature/figma-dzsa-overhaul`

## Goal

Upgrade the existing Monarch Launcher without replacing its identity. The user-provided Figma is the visual baseline, but spacing, sizing, hierarchy, transitions, hover states, and usability may be improved where needed. The launcher should behave more like DZSA for DayZ server joining and mod setup while preserving Monarch branding.

## Visual Direction

- Keep the existing Figma layouts as the base for Servers, Favorites, Played On, Mods, Mod Details, Server Details, and Settings.
- Active left-nav item uses `#1A212B`.
- Keep the Monarch dark UI and improve consistency rather than introducing a new design system.
- Top branding uses the Monarch `M` logo as the M in `MONARCH`; remove the `DayZ Launcher` subtitle.
- Settings, Mod Details, and Server Details open as smooth right-side slide-out panels and close with the same motion.
- Bottom portions of mod cards may remain partially visible to indicate the page is scrollable.
- Use React Icons for non-Monarch icons.
- Use the provided Monarch click sound for interactive clicks.
- Use the Monarch M logo as the Windows application/installer icon.

## Navigation

Persistent shell with these views:

- Servers
- Favorite
- Played On
- Mods

Selecting a view updates the main content without rebuilding the whole shell. The selected tab gets the `#1A212B` highlight.

`Check for updates` lives at the bottom-left of the sidebar.

## Server Browser

Server rows should remain compact and quickly scannable. Core row content:

- Favorite star
- Server name
- Map
- Players / capacity
- Ping
- Mod count / mod indicator
- Password key icon when locked
- Join button
- Arrow/view control for opening Server Details

Use React Icons for star, key, copy, arrow, and other utility icons.

Do not show country.

### Favorite Icons

- Unfavorited: `FaRegStar`
- Favorited: `FaStar`

## Server Details

Open from the row, view area, or arrow beside Join.

Show:

- Server name
- Map
- Players / capacity
- Ping
- IP and port
- React Icons copy control for IP/port
- Perspective info where available
- Password status
- Last played information
- Server-required mod information using a DZSA-style presentation rather than custom per-mod status clutter
- Join button remains available

Do not show country.

## Password-Protected Servers

If a server requires a password:

1. Show a React Icons key icon in the server list/details.
2. Pressing Join opens a password prompt.
3. The password is passed into the DayZ launch command.
4. Cancel closes the prompt and does not launch.

Passwords should be kept only as long as needed for the launch unless a future explicit password-saving feature is added.

## Ping

Do not rely only on the ping value returned by the server directory. Monarch should asynchronously query/measure server reachability/ping so the UI gets a real per-server value.

Requirements:

- Server list renders without waiting for every ping.
- Individual ping values update asynchronously.
- Refreshing one ping or opening details must not refresh the entire page.
- Failed/unreachable ping should degrade cleanly to `--` or equivalent.

## Missing Mods — DZSA-style Flow

When Join is pressed:

1. Resolve the server's required Workshop IDs.
2. Compare the full required set against the user's signed-in Steam Workshop state/install state.
3. If everything needed is installed and ready, continue to launch.
4. If anything is missing or requires setup, stop the launch and present a DZSA-style `Setup Mods` flow.
5. Use the user's normal signed-in Steam client/Steam Workshop subscriptions. Do not use a separate SteamCMD-owned duplicate library for normal server joining.
6. Subscribe/download/update required mods through Steam.
7. Show setup/download state while Steam works.
8. Do **not** auto-join after setup finishes.
9. When ready, tell the user to press Join again.

The required-mod UI should follow the compact DZSA concept: the launcher handles the required set as one server setup operation rather than placing custom Installed/Missing/Updating text beside every mod in Server Details.

## DayZ Launch Behavior

### Normal Launch

- Normal launch uses Steam/DayZ's proper BattlEye path.
- Avoid creating competing DayZ/BattlEye instances.
- Fix the current `Game restart required` / BattlEye restart behavior caused by the existing launch approach.

### Skip BattlEye

Copy DZSA behavior:

- Default: OFF
- OFF: normal BattlEye launch
- ON: launch DayZ without BattlEye

### DayZ Already Running

When the user presses Join while DayZ is running, show:

`DayZ is currently running. Would you like to close it?`

Actions:

- Close DayZ
- Cancel

If the user chooses Close DayZ, Monarch waits until the DayZ process is actually gone before allowing the next launch.

### Launch Status

When DayZ was launched from Monarch, show a state such as:

`Launching <server name>` / `Playing <server name>`

When DayZ exits, return to normal launcher state and preserve the server in Played On / Last Played.

## Mods Page

Search filters **installed mods only**. It does not search the full Workshop.

Each mod card should stay simple. Default visible information:

- Mod artwork
- Mod name
- Action buttons

Detailed description and metadata appear only after the user opens the Mod Details panel.

### Fallback Artwork

If a Workshop mod has no custom preview image, use the Monarch logo as the fallback artwork.

### Buttons / Icons

Use React Icons for non-Monarch controls, including the requested icons:

- Update: `RxUpdate`
- Files: `VscFiles`
- Trash: `FaTrashCan`

### Updating a Mod

`Check for update` on one mod must update that mod's state only. It must not cause a whole-page refresh/reset.

### Deleting a Mod

Deleting/unsubscribing a mod must show a confirmation before changing Steam Workshop state.

### Download / Update State

Show Steam download/update status in place. Do not navigate away or rebuild the page.

## Mod Details Slide-Out

Clicking a mod opens a right-side slide-out with real Workshop information where available:

- Mod name
- Workshop image
- Description
- Workshop ID/link
- Last updated time
- Size when available
- Installed location
- Subscription state
- Download/update state
- Update/file/uninstall actions

If metadata is unavailable, display graceful fallback values rather than fake information.

## Settings Slide-Out

Match the user's Figma and include at minimum:

- DayZ path
- In-game name
- Skip BattlEye
- Discord Presence
- Verify Mods
- Uninstall All Mods
- Refresh

Settings should save without requiring a whole-app reload.

### Verify Mods

Verify/check the user's DayZ Workshop mod installation without deleting all subscriptions.

### Uninstall All Mods

Require a stronger confirmation because the action affects every detected DayZ Workshop subscription/mod managed by Monarch.

## Discord Rich Presence

Settings toggle controls Rich Presence.

Example launcher state:

- `Monarch Launcher`
- `Browsing Servers`

Example playing state when launched via Monarch:

- `Playing <server name>`
- `<map> • <players>/<capacity>` where available

When DayZ exits, restore launcher presence.

## Click Sound

Use the provided `.ogg` UI click sound.

Implement it centrally so normal interactive controls trigger it consistently instead of duplicating audio logic in every component.

Expected targets include:

- Navigation
- Server rows/actions
- Join
- Favorite
- Copy IP
- Slide-out controls
- Mod actions
- Settings controls
- Confirmation actions
- Update controls

## Launcher Updater

Move updater entry to bottom-left.

States:

- Checking
- Up to date
- Update available
- Download/install
- Error

The current `Automatic updates are not configured in this build.` failure must be removed by configuring the signed Tauri updater pipeline correctly for release builds.

GitHub Releases remain the update distribution mechanism.

## Packaging / Branding

- Keep normal installed Windows application behavior.
- Continue using Tauri/NSIS packaging.
- Use the Monarch M asset for application and installer icons.
- Avoid making users manually manage a folder full of runtime files.

## Data / API Changes

Likely model/API additions include:

- Server password support for launch requests
- Live ping result/update APIs
- Server mod-setup result/state
- Expanded Workshop metadata
- Workshop subscribe/download/progress support
- DayZ running-process detection/close commands
- Skip BattlEye setting
- Discord Presence setting
- Mod verification/uninstall-all actions
- Playing/launch status

Keep these responsibilities behind focused Tauri commands rather than putting OS/Steam logic in React components.

## Architecture

### React / Next UI

Responsibilities:

- Figma-based presentation
- Navigation state
- Search/filter state
- Slide-out state
- Mod/server selection
- Confirmation/password dialogs
- Per-item busy/progress state
- Sound playback

### Tauri / Rust

Responsibilities:

- Steam discovery and Workshop state
- Workshop subscribe/download/update operations
- DayZ process detection and launch
- BattlEye vs skip-BattlEye launch paths
- Server ping/query work
- Persistent launcher settings
- Played On / favorites
- Updater integration
- Discord Rich Presence integration

## Error Handling

All long-running actions should fail locally without destroying the current page state.

Examples:

- Failed mod update: show error on/near the affected mod.
- Failed ping: show unknown ping, keep server row.
- Steam unavailable: show actionable setup error, do not silently pretend mods are installed.
- Missing required mod metadata: keep Workshop ID and allow the server setup flow to continue where possible.
- Failed DayZ close: do not start a second copy.
- Updater configuration/release errors: show a useful error without crashing the launcher.

## Testing

Frontend tests should cover:

- Active nav highlighting
- Installed-mod search
- Slide-out open/close state
- Password dialog behavior
- Mod action state staying local to one card
- Missing-mod setup prompt behavior
- Join-again-after-setup behavior
- Confirmation dialogs

Rust tests should cover:

- Launch argument building for normal and passworded servers
- BattlEye / skip-BattlEye paths
- Missing-mod set resolution
- Workshop metadata parsing
- Mod subscribe/update state mapping
- Ping result parsing/error handling
- Settings serialization

CI must continue passing frontend typecheck/tests and Rust fmt/clippy/tests before release.

## Success Criteria

The overhaul is complete when:

- The app visibly matches and improves the user's Figma rather than reverting to the old UI.
- Active tabs use `#1A212B`.
- Mod fallback art uses the Monarch logo.
- Mod/Settings/Server panels slide smoothly.
- Installed-mod search works.
- Mod details are real and only shown when opened.
- Click sound works consistently.
- Missing mods are handled through normal signed-in Steam in a DZSA-style setup flow.
- Player must press Join again after mod setup.
- Passworded servers can prompt for and launch with a password.
- Server details use React Icons for copy/key/etc.
- Country is absent.
- Ping is independently refreshed/measured.
- DayZ-running confirmation exists.
- BattlEye restart-required behavior is fixed.
- Mod update checks do not refresh the entire Mods page.
- Settings match the requested Figma controls.
- Discord Rich Presence works.
- Check for Updates is bottom-left and release updater configuration works.
- Played On / Last Played works.
- Monarch M is the app icon and the top wordmark aligns correctly.
