# Monarch Launcher — Full Figma UI Replacement Design

Date: 2026-08-29

## Goal

Delete the entire AI-made visible frontend and rebuild the launcher presentation from a blank frontend surface using the user's Monarch Figma/screens and supplied SVG assets as the only visual source of truth.

The working Rust/Steam/DayZ backend remains. The old visible shell, page structure, table styling, cards, drawers, generic headers, dashboard layout, spacing system, branding implementation, and CSS are not to be restyled or blended back in.

## Design source

Figma: `https://www.figma.com/design/6cXfiObXH8TIApkAbH36Ia/Monarch-UIS?node-id=2-111&t=x5uWNDNH0E1bDutc-1`

Supplied visual states:
- Servers
- Mods
- Mod Info
- Mod download/update status
- Settings

Supplied brand assets:
- `LogoWhite.svg` — Monarch M mark
- `onarch.svg` — `onarch` wordmark

These SVGs must be used directly. Do not recreate them as PNGs, data URLs, text, or icon-font glyphs.

## Hard visual rule

No old AI-created visible UI may survive.

Backend/data hooks can be reused, but new visible components must be created for:
- launcher shell
- left navigation
- server filters
- server list rows/table
- Server Info
- Mods grid
- Mod Info
- mod download status
- Settings
- dialogs and prompts
- updater/status presentation

## Shell and branding

- Compact left rail matching the user's screens.
- Navigation: Servers, Favorite, Played On, Mods.
- Selected item uses the dark Monarch selected treatment from the user's UI.
- Top-left branding uses `LogoWhite.svg` + `onarch.svg` with the exact relative proportions/alignment of the user's design.
- App/taskbar/installer icon uses the supplied M mark.
- Settings, Server Info, and Mod Info use the user's compact right-side drawer language.
- No generic dashboard headers or descriptions such as `Servers` plus `Public DayZ servers load automatically`.
- No full-screen dim flash when drawers open.
- Standard action icons may use `react-icons`; Monarch branding may not.

## Steam-required startup

Monarch must not operate when Steam is closed.

At startup:
- detect whether the signed-in Steam client is running and available;
- if unavailable, show a Monarch-styled blocking Steam-required screen/dialog;
- do not load Workshop/mod actions, join servers, or initialize Steamworks-dependent features until Steam is available;
- provide a retry action after the user opens Steam;
- do not silently start Steam or fall back to SteamCMD for normal server mod management.

## Servers

Use the user's compact server-list layout as the base.

Visible row data/actions:
- favorite
- server name
- map
- players/capacity
- ping
- mods/vanilla
- perspective
- info/view action
- join

Behavior:
- cached servers render immediately while a live directory refresh runs in the background;
- favorites are always sorted to the top of the main Servers list;
- ping updates asynchronously without blocking directory rendering;
- all server search results display at once;
- there is no pagination/pages anywhere in the server UI;
- Server Info opens from row/info action;
- password flow, missing-mod flow, DayZ-running flow remain functional;
- no separate save button is required for favorite/settings state that can be persisted immediately.

### Ping colors

Use DZSA-style ping status colors:
- good latency: green;
- medium latency: yellow/orange;
- bad latency: red;
- timeout/unavailable: muted gray.

The exact thresholds should be centralized in one helper and covered by tests.

## Favorites and Played On

Saved collections are identity/history records, not authoritative server snapshots.

When live directory data exists for a saved server, display current live data. A server saved at 2/60 but currently 30/60 must show 30/60.

Reconcile current fields including players, capacity, ping, name, map, status, required mods, and perspective. If a saved server cannot currently be resolved, use its saved snapshot as fallback.

Ping runs for visible Favorite and Played On rows too.

## Server Info

Use the user's drawer style. Keep useful runtime data without introducing the old AI card/dashboard visual language.

Include:
- name
- online/offline
- community/official
- address with copy action
- query port
- map
- players/capacity
- live ping with ping color
- perspective
- country/region when available
- password indicator
- Last Played when available
- required Workshop mods with Installed / Missing / Downloading / Updating / Needs Update status
- Join

## Mods

Use the user's Figma mod grid as the visible base.

Performance requirements:
- opening Mods must render immediately from already-known/local data;
- do not block first paint on slow Workshop metadata/network enrichment;
- metadata and download state enrich in the background;
- the page automatically refreshes when Steam adds, removes, downloads, installs, or updates a DayZ Workshop item;
- updating one mod updates that item in place instead of rebuilding the entire view.

Preview behavior:
- use the Workshop preview when it is a real custom image;
- generic DayZ Workshop/User Content placeholder counts as missing and uses the supplied Monarch M;
- broken/missing image uses the supplied Monarch M.

## Mod Info

Use the user's Mod Info drawer and simplify it.

Do not show the Workshop description.

Show:
- preview/fallback image
- mod name
- creator
- Steam Workshop link
- live install/download/update state
- real progress when Steam provides bytes/percent
- update action
- open folder action
- uninstall action with confirmation

Do not fill the panel with extra AI-added metadata cards.

## Mod download status

The current download/install behavior must be made reliable through the signed-in Steam client/Steamworks flow.

Requirements:
- missing required server mods are subscribed/downloaded through Steam, not SteamCMD;
- subscribed/queued/downloading items appear in the Mods page even before the final Workshop directory is complete;
- status appears immediately when Steam reports queued/downloading/updating, even before totals exist;
- when totals exist, show real percent and downloaded/total bytes;
- poll/refresh until Steam reports installed, not downloading, and not needing update;
- after required mods finish, show `Ready — press Join again`; do not auto-launch DayZ;
- Mods page reflects completion automatically.

## Settings

Use the user's Settings drawer only.

Controls:
- DayZ Path
- Ingame Name
- Skip BattlEye
- Discord Presence
- Verify Mods
- Uninstall All Mods
- Refresh

Behavior:
- settings changes persist automatically without a separate Save Settings button;
- DayZ path stores/displays the install directory, not `DayZ_x64.exe`;
- legacy executable-path settings migrate automatically;
- settings data is preloaded so opening the drawer does not flash/loading-swap its contents;
- folder chooser/process helpers must not create visible CMD windows.

## Click sound

Use the supplied `Header_Click_UI.mp4` click source.

- Increase playback volume relative to the current build so the beep is clearly audible.
- Trigger centrally for normal clickable controls.
- Do not fire for disabled controls or ordinary text-entry interaction.

## Discord Rich Presence

Discord application ID: `1543377507770826762`.

Use a maintained Discord IPC/Rich Presence client.

Desired display:
- application title: `Monarch Launcher`;
- Monarch M as large image asset when the Discord application has the matching asset configured;
- browsing state while idle;
- server/join state while launching/playing.

Presence defaults enabled. Failure to connect to Discord must not break the launcher.

The build workflow must inject this app ID instead of relying on an unset repository variable for normal verification builds.

## CMD/process behavior

No visible CMD/console windows may flash when:
- opening Settings;
- opening Mods;
- discovering Steam/DayZ paths;
- checking processes;
- launching helper commands;
- refreshing mod state;
- joining/killing DayZ.

Windows helper processes must use hidden/no-window flags.

## App icon

The taskbar/application/installer icon must use the supplied Monarch M artwork instead of the tiny/incorrect current icon rendering.

Generate the Windows icon from the supplied SVG at appropriate multi-resolution sizes and materialize it during the build.

## Testing and release gate

Use TDD for behavior changes.

Add/adjust regression tests for:
- no old generic shell/header survives;
- exact SVG branding is used;
- favorites sort first;
- Favorite/Played On live reconciliation;
- no server pagination and search shows all results;
- DZSA ping color thresholds;
- Steam-required startup gate;
- settings auto-save;
- Mods first paint is not blocked on metadata enrichment;
- Mods automatic live refresh;
- Mod Info has creator + Steam link and no description;
- live Workshop download/progress behavior;
- click MP4 source and increased volume;
- Discord app ID configuration;
- hidden Windows helper process flags.

Final branch must pass:
1. TypeScript typecheck
2. all frontend tests
3. production static Next build
4. rustfmt
5. Clippy with warnings denied
6. all Rust tests
7. Windows Tauri NSIS installer build
8. launcher startup smoke test
9. setup EXE artifact upload

The new EXE is not done until every gate above succeeds.