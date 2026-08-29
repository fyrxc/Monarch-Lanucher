# Monarch Launcher — Figma UI Replacement Design

Date: 2026-08-29

## Goal

Replace the current AI-made frontend presentation with the user's Monarch Figma/screens as the visible source of truth while preserving the working Rust/Steam/DayZ backend underneath it.

The old frontend layout must not be blended back in. Existing APIs and backend logic may be reused, but visible page structure, spacing, cards, drawers, tables, and branding are rebuilt around the user's screens.

## Design source

Figma: `https://www.figma.com/design/6cXfiObXH8TIApkAbH36Ia/Monarch-UIS?node-id=2-111&t=x5uWNDNH0E1bDutc-1`

Known supplied states:
- Servers
- Mods
- Mod Info
- Mod download/update status
- Settings
- Monarch M logo + `onarch` wordmark

The supplied screens are the base and may be extended for missing runtime states, but the previous AI-created layout is not to return.

## Shell and branding

- Fixed left navigation: Servers, Favorite, Played On, Mods.
- Selected item uses the Monarch dark selected treatment.
- Branding in the launcher uses the supplied Monarch M plus `onarch` wordmark.
- App/taskbar/installer and missing-mod preview fallback use the plain transparent M.
- Settings opens as a compact right drawer in the user's style.
- Server Info and Mod Info use the same right-drawer language.
- No full-screen dim flash when drawers open.
- Keep standard icons from `react-icons`; do not replace Monarch branding with icon-font glyphs.

## Servers

Use the user's compact server-list layout as the base.

Visible columns/actions:
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
- cached servers render immediately while live refresh happens in background
- ping updates asynchronously without blocking directory rendering
- non-empty server search shows all matches with no pagination
- unsearched server directory may paginate for performance
- Server Info opens from row/info action
- password flow, missing-mod flow, DayZ-running flow remain functional

## Favorites and Played On

Saved collections are identity/history records, not authoritative live snapshots.

When live directory data exists for a saved server, display the current live server object. Example: a server saved at 2/60 but currently 30/60 must display 30/60.

Reconcile live fields including players, capacity, ping, name, map, status, required mods, and perspective. If a saved server cannot currently be resolved from the live directory, keep the saved snapshot as fallback.

Ping must run for visible Favorites and Played On rows too.

## Server Info

Extend the user's drawer style with:
- name
- online/offline
- community/official
- address with copy
- query port
- map
- players/capacity
- live ping
- perspective
- country/region
- password indicator
- Last Played when available
- required Workshop mod names and statuses
- Join

Mod statuses include Installed, Missing, Updating/Downloading, and Needs Update when reported.

## Mods

Use the user's mod grid as the base.

- only installed/local DayZ Workshop mods
- search installed mods
- custom Workshop preview image when available
- generic DayZ Workshop/User Content placeholder counts as no custom image and uses Monarch M
- broken/missing image also uses Monarch M
- click card opens Mod Info
- Steam changes refresh automatically while page remains open
- installing/updating/uninstalling externally updates cards without requiring manual refresh
- update action does not refetch/rebuild the whole page as the only source of progress; progress is localized to affected cards

## Mod Info

Extend the user's Mod Info drawer with:
- preview/fallback image
- name
- Workshop ID
- description
- Steam Workshop link
- install path / open folder action
- installed size when available
- update state
- update action
- uninstall action with confirmation
- live download/update status

## Mod download status

When Steam reports an item queued/downloading/updating, status appears immediately even before byte totals are available.

When totals exist, display real percent and downloaded/total bytes. Continue polling until Steam reports installed, not downloading, and not needing update.

The Mods page automatically reflects completion and newly installed mods.

## Settings

Use the user's Settings drawer as the base and extend it only as needed for working controls:
- DayZ Path
- Ingame Name
- Skip BattlEye
- Discord Presence
- Verify Mods
- Uninstall All Mods
- Refresh
- save behavior when needed

DayZ path auto-detection stores/displays the DayZ install directory, not `DayZ_x64.exe`. Existing legacy executable-path settings migrate automatically.

Discord Presence defaults enabled.

## Click sound

Use the user-supplied `Header_Click_UI.mp4` as the click-sound source instead of the old audio asset. Every normal clickable launcher control should trigger it centrally, excluding disabled controls and text-entry interaction.

## Discord Rich Presence

Fix real runtime Rich Presence, not just the payload formatter.

Desired display:
- Monarch M as large image asset
- title/application presentation: `Monarch Launcher`
- browsing state when idle
- server/join state while launching/playing

Presence is enabled by default. Failure to connect to Discord must not break the launcher.

## CMD/process behavior

Server join, Steam discovery, DayZ process checks, tasklist/taskkill/registry helpers must not flash visible CMD/console windows.

## Testing and release gate

Use TDD for behavior changes.

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

The new EXE is not considered done before every gate above succeeds.