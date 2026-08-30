# Monarch Launcher Runtime, Performance, Steam Identity, and Mod Management Design

## Scope

This spec covers four connected improvements on `rewrite/nextjs-rust`:

1. Reduce lag when opening the Servers view and searching/filtering public servers.
2. Fix JOIN so Monarch reliably starts DayZ with BattlEye, server connection arguments, required Workshop mods, and the configured player name.
3. Default the in-game DayZ player name to the active Steam account's public PersonaName when the user has not explicitly saved a custom name.
4. Redesign the Mods view as rounded Workshop cards with preview image, title, Workshop ID, folder path, update state/actions, open-folder action, and proper Steam Workshop unsubscribe behavior.

## 5A — Server browser performance

### Problem

The launcher currently keeps the full public server directory in React state, filters the complete collection on each search/filter change, and renders every matching row. With a large public DayZ directory this creates unnecessary synchronous work and thousands of DOM nodes, which explains the lag when opening Servers and typing into search.

### Design

- Keep the full directory cached in memory after the initial fetch.
- Add client-side pagination with a fixed page size of 100 servers.
- Filter the in-memory directory, but only render the current page.
- Reset the current page to 1 when search/filter state changes.
- Use React deferred search input so typing remains responsive while the filtered result is recalculated.
- Memoize the server table and server rows where practical so unrelated UI state does not force a full table rerender.
- Keep the visible result count based on the complete filtered set, not only the current page.
- Preserve existing favorites, recent, map, ping, population, perspective, password, official, and modded filters.

### Success criteria

- Opening Servers does not create thousands of table rows at once.
- Typing in search remains responsive with the full public directory loaded.
- The user can move through matching servers using Previous/Next and a page indicator.

## 5B — Reliable DayZ JOIN

### Problem

The current launcher starts `steam.exe -applaunch 221100` and appends DayZ connection/mod arguments. The launcher can report success after Steam starts even if those arguments never reach the expected DayZ/BattlEye process.

### Design

- Extend Steam discovery to locate all required DayZ executables under the detected DayZ installation root:
  - `DayZ_x64.exe`
  - `DayZ_BE.exe`
- Launch the BattlEye bootstrap directly from the DayZ install directory.
- The exact process prefix is `DayZ_BE.exe 0 1 1 -exe DayZ_x64.exe` followed by the DayZ arguments built by Monarch.
- Preserve:
  - `-connect=<ip>`
  - `-port=<game port>`
  - `-name=<player name>` when non-empty
  - `-mod=<path1;path2;...>` in the server-provided Workshop order
  - validated extra launch parameters
- Set the child process working directory to the DayZ install directory.
- Continue blocking launch when a required Workshop mod is not installed or cannot be verified.
- Return a specific error when `DayZ_BE.exe` or `DayZ_x64.exe` is missing.
- Only record the server in Recent after the BattlEye process is successfully spawned.

### Tests

- Unit-test construction of the BattlEye launch command separately from process spawning.
- Preserve existing tests for server address, player name, mod ordering, missing mods, and launch-parameter validation.

## 5C — Steam public name as default DayZ name

### Problem

The default `dayzName` is empty, so users must type a name manually even when Steam already has a public PersonaName.

### Design

- Parse the active Steam client's `config/loginusers.vdf`.
- Select the account with `MostRecent = 1`; if unavailable, fall back to the first account that has a non-empty PersonaName.
- Expose the detected PersonaName through the backend.
- When settings load:
  - keep a user-saved non-empty `dayzName` unchanged;
  - otherwise populate the Settings UI with the detected Steam PersonaName;
  - JOIN uses the same fallback even if the user has never opened Settings.
- Do not silently overwrite a custom player name after the user saves one.
- If no PersonaName can be found, retain the existing empty-name behavior and allow manual entry.

### Tests

- Parse a representative `loginusers.vdf` fixture containing multiple accounts.
- Verify `MostRecent` selection.
- Verify custom saved names override the Steam fallback.

## 5D — Workshop-style Mods page

### Visual design

Use the supplied reference as the layout direction, not as a literal copy:

- dark Monarch card surface
- strongly rounded outer corners
- wide Workshop preview image at the top/left depending on responsive width
- mod title as the primary text
- Workshop ID as secondary metadata
- full local folder location in a subdued path row
- compact action buttons with clear hierarchy

Each card shows:

- Steam Workshop preview image
- real Workshop title
- Workshop ID
- local folder path
- update status
- `UPDATE`
- `OPEN FOLDER`
- `UNINSTALL`

### Workshop metadata

- Batch-query public Steam Workshop published-file metadata for installed DayZ Workshop IDs.
- Use the returned Workshop title and preview image URL when available.
- Fall back to the locally parsed mod name and a neutral placeholder when metadata is unavailable.
- Cache metadata for the lifetime of the launcher session so opening Mods repeatedly does not refetch every image/title immediately.

### Update state and update action

- Integrate Steamworks UGC for the DayZ Workshop context while the Steam client is running and the user is logged in.
- Read item state to distinguish installed/up-to-date versus `NeedsUpdate`/downloading states.
- `UPDATE` requests the item download/update through Steamworks instead of deleting or manually copying Workshop files.
- Refresh the card after Steam reports the new state.
- Disable the Update button when the item is already current.

### Proper uninstall behavior — Option A selected

The user selected proper Workshop unsubscribe behavior.

- `UNINSTALL` calls Steamworks `ISteamUGC::UnsubscribeItem` for the Workshop item.
- Do not directly delete the Workshop directory as the primary uninstall mechanism.
- Steam remains the source of truth for the subscription and removes the content according to Steam's Workshop lifecycle.
- Require explicit confirmation in the UI before unsubscribing.
- After success, refresh the installed-mod list and show a clear status message.
- If Steam is not running/logged in or Steamworks cannot initialize, show an actionable error instead of falling back to destructive local deletion.

### Open folder

- Add a backend command that validates the target is one of the currently discovered DayZ Workshop paths and opens it in Windows Explorer.
- Do not accept arbitrary frontend filesystem paths without validation.

## API/model changes

Expected model additions:

- Steam profile/persona information or a `defaultDayzName` field in status/settings response.
- Extended installed-mod data:
  - `workshopId`
  - `name`
  - `path`
  - `previewUrl`
  - `needsUpdate`
  - `isDownloading`
  - `isSubscribed`

Expected commands:

- existing `get_installed_mods` becomes enriched or is replaced with an enriched equivalent
- `update_workshop_mod(workshopId)`
- `unsubscribe_workshop_mod(workshopId)`
- `open_workshop_mod_folder(workshopId)`

## Error handling

- Server-directory failures remain non-fatal to the application shell.
- JOIN failures surface the exact missing executable/mod/process-spawn error.
- Steam PersonaName detection is best-effort and never blocks startup.
- Steam Workshop metadata failures produce fallback cards, not a broken Mods page.
- Steamworks failures disable update/uninstall functionality and explain that Steam must be running/logged in.

## Verification

Automated verification must include:

- frontend typecheck
- frontend tests
- Next.js production build
- Rust format check
- Rust Clippy with warnings denied
- Rust tests
- Windows NSIS build
- existing launcher startup smoke test
- new tests for pagination/search behavior, Steam PersonaName parsing, BattlEye launch arguments, and Workshop action validation

Runtime-only items that CI cannot prove will be tested on the user's Windows PC after a fresh installer is produced:

- actual DayZ/BattlEye launch into a real server
- Steam public PersonaName detection against the user's live Steam config
- Steamworks Workshop update/unsubscribe behavior against the user's logged-in Steam client

## Out of scope

- Automatic subscription/download of missing server mods during JOIN is not part of this batch.
- A custom Workshop marketplace/browser is not part of this batch.
- Launcher auto-update behavior is unchanged by this spec.
