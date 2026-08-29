# Monarch Launcher Figma + DZSA Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing Monarch Launcher to match and improve the approved Figma while adding DZSA-style server mod setup, passworded server joining, correct DayZ/BattlEye behavior, richer Workshop management, live ping, settings, Rich Presence, updater placement, sound, and Monarch branding.

**Architecture:** Keep React responsible for presentation and local interaction state while moving Steam, DayZ process, ping, Workshop and updater behavior behind focused Tauri commands. Reuse the existing server directory, favorites/recent store, Steam discovery and Workshop code instead of replacing the launcher. Implement in independently testable slices with frontend Vitest tests and Rust integration/unit tests before each behavior change.

**Tech Stack:** Next.js / React / TypeScript, React Icons, Tauri 2, Rust 2021, reqwest, steamworks, Tauri updater, Windows process APIs/commands, Discord Rich Presence integration.

**Spec:** `docs/superpowers/specs/2026-08-29-figma-dzsa-overhaul-design.md`

## Global Constraints

- Work only on `feature/figma-dzsa-overhaul` until verification passes.
- The Figma is the visual baseline; polish is allowed but do not replace it with a different launcher design.
- Active navigation background is exactly `#1A212B`.
- Left navigation labels are `Servers`, `Favorite`, `Played On`, and `Mods`; Settings is a separate slide-out action.
- Use React Icons for non-Monarch icons, including `RxUpdate`, `VscFiles`, `FaTrashCan`, `FaRegStar`, and `FaStar`.
- Do not show country in server list/details.
- Missing required server mods use the normal signed-in Steam client and a DZSA-style Setup Mods flow; do not use a separate SteamCMD library for normal joining.
- Finishing missing-mod setup never auto-joins; the player presses Join again.
- Passwords are launch-only and are not persisted.
- Skip BattlEye defaults OFF and mirrors DZSA behavior.
- `Check for updates` lives at bottom-left.
- Mod search filters installed mods only.
- Clicking Update on one mod must not reload/reset the full Mods page.
- CI verification remains frontend typecheck/tests/build plus Rust fmt/clippy/tests and Tauri/NSIS build.

---

### Task 1: Figma shell, navigation, icons, sound, and slide panels

**Files:**
- Modify: `package.json`
- Modify: `components/navigation.tsx`
- Modify: `components/app-shell.tsx`
- Modify: `app/globals.css`
- Create: `components/slide-panel.tsx`
- Create: `components/confirm-dialog.tsx`
- Create: `components/click-sound.tsx`
- Test: `tests/app-shell.test.tsx`

**Interfaces:**
- Produces: `LauncherView = "Servers" | "Favorites" | "Recent" | "Mods"`.
- Produces: `SlidePanel({ open, title, onClose, children })` with right-side animated presentation.
- Produces: one root click-sound handler that plays the provided OGG for interactive controls.

- [ ] **Step 1: Write failing frontend tests**

Add tests that assert:

```tsx
expect(screen.getByRole("button", { name: "Servers" })).toHaveClass("active");
expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
expect(screen.queryByText("DAYZ LAUNCHER")).not.toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: "Settings" }));
expect(await screen.findByRole("dialog", { name: "Settings" })).toBeInTheDocument();
```

Also assert the left navigation contains `Servers`, `Favorite`, `Played On`, `Mods` and that Settings is not one of those nav items.

- [ ] **Step 2: Run frontend tests and confirm RED**

Run: `npm test -- tests/app-shell.test.tsx`
Expected: FAIL because current navigation still exposes Favorites/Recent/Settings as plain views and no slide-out dialog exists.

- [ ] **Step 3: Implement shell and shared controls**

Add `react-icons` dependency, update navigation labels while keeping internal collection data unchanged, remove the `DAYZ LAUNCHER` subtitle, place Settings as a top-right action, use `#1A212B` for active nav, and implement the reusable slide panel/confirmation primitives. Centralize click audio at the app shell so button/interactive clicks call one sound player rather than duplicating `Audio` logic.

- [ ] **Step 4: Run tests/typecheck**

Run: `npm run typecheck && npm test -- tests/app-shell.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: align launcher shell with Monarch Figma`

---

### Task 2: Server row, server details, locked-server password prompt

**Files:**
- Modify: `components/server-table.tsx`
- Modify: `components/app-shell.tsx`
- Modify: `app/globals.css`
- Create: `components/server-details.tsx`
- Modify: `lib/api.ts`
- Modify: `lib/models.ts`
- Test: `tests/app-shell.test.tsx`
- Test: `src-tauri/tests/launcher.rs`

**Interfaces:**
- Produces frontend `LaunchServerRequest { server: DayzServer; password: string | null }`.
- Produces `onDetails(server)` from `ServerTable`.
- Produces password dialog before calling launch for `server.isPassworded === true`.

- [ ] **Step 1: Write failing UI tests**

Add tests that assert country text is absent, a locked server renders an accessible key control/icon, the details arrow opens a `Server Details` dialog, IP/port has a Copy button, and pressing Join on a locked server opens a password field without calling `launchServer` until submission.

- [ ] **Step 2: Write failing Rust launch test**

Add to `src-tauri/tests/launcher.rs`:

```rust
#[test]
fn password_is_added_as_a_single_dayz_argument() {
    let args = build_dayz_args_for_test(&server(), &LauncherSettings::default(), &[], Some("secret pass"))
        .expect("password args");
    assert!(args.iter().any(|arg| arg == "-password=secret pass"));
}
```

Use a public testable builder signature introduced by the implementation rather than exposing unrelated internals.

- [ ] **Step 3: Verify RED**

Run frontend/Rust targeted tests. Expected: failures because details/password support does not exist.

- [ ] **Step 4: Implement server presentation and password request contract**

Use `FaRegStar`/`FaStar`, a React Icons key, copy icon and chevron/arrow. Keep Join immediately visible and add an adjacent details arrow. Remove country from visible server rows. Add server details slide-out with name, map, players, ping, IP:port, perspective, password state, last-played value when available, compact required-mod summary, and Join.

Change `launchServer` API to take a request object with optional password; never store the password in settings/collections.

- [ ] **Step 5: Verify GREEN and commit**

Run frontend typecheck/tests and Rust launch tests. Commit: `feat: add server details and passworded joins`.

---

### Task 3: Installed Mods grid/search, real details metadata, local card updates

**Files:**
- Modify: `components/mod-card.tsx`
- Modify: `components/mod-card.module.css`
- Modify: `components/app-shell.tsx`
- Create: `components/mod-details.tsx`
- Modify: `lib/models.ts`
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/workshop/metadata.rs`
- Modify: `src-tauri/src/commands.rs`
- Test: `tests/app-shell.test.tsx`
- Test: `src-tauri/tests/workshop_metadata.rs`

**Interfaces:**
- Expand Workshop metadata with `description`, `fileSize`, `timeUpdated`, and `workshopUrl`/ID-derived URL data where available.
- `ModCard` shows only artwork, mod name, and icon action buttons by default.
- Clicking card/name opens `Mod Details` slide-out.

- [ ] **Step 1: Write failing tests**

Frontend: installed-mod search hides non-matching installed cards; card default view does not expose path/description; clicking opens Mod Details; missing preview renders Monarch fallback; Update invokes only that mod and leaves sibling cards mounted; uninstall requires confirmation.

Rust: extend Workshop metadata fixture and assert description, file size and update timestamp parse correctly while missing fields remain optional.

- [ ] **Step 2: Verify RED**

Run targeted frontend and Rust metadata tests.

- [ ] **Step 3: Implement**

Use `RxUpdate`, `VscFiles`, and `FaTrashCan`. Convert the Mods page to the Figma-style scrollable grid and add installed-only search. Keep per-mod state in a keyed map so update/status refresh replaces only the affected mod object instead of calling `loadInstalledMods()` for the entire list. Add graceful metadata fallbacks and Monarch fallback artwork.

- [ ] **Step 4: Verify GREEN and commit**

Run `npm run typecheck`, frontend tests and Workshop metadata Rust tests. Commit: `feat: rebuild installed mods experience`.

---

### Task 4: DZSA-style missing-mod setup through signed-in Steam

**Files:**
- Modify: `src-tauri/src/workshop/steamworks_ugc.rs`
- Modify: `src-tauri/src/workshop/sync.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `lib/models.ts`
- Modify: `lib/api.ts`
- Modify: `components/app-shell.tsx`
- Create: `components/mod-setup-dialog.tsx`
- Test: `src-tauri/tests/workshop_sync.rs`
- Test: `tests/app-shell.test.tsx`

**Interfaces:**
- Produces `prepare_server_mods(server: DayzServer) -> ServerModSetupResult`.
- Produces `setup_server_mods(server: DayzServer) -> ServerModSetupResult` that subscribes/requests downloads using Steamworks.
- Result reports aggregate required/missing/updating/ready state; UI does not show custom status text beside every required mod.

- [ ] **Step 1: Write failing Rust tests**

Test aggregate setup planning: all present => ready; missing subscription => setup required; needs-update => setup required. Test deterministic required ID ordering/deduplication.

- [ ] **Step 2: Write failing UI tests**

Join on server with setup-required response must show `Setup Mods`; pressing Setup calls the setup API; when result becomes ready the UI says to press Join again and does not call launch automatically.

- [ ] **Step 3: Verify RED**

Run targeted tests.

- [ ] **Step 4: Implement signed-in Steam setup**

Add Steamworks subscribe callback support plus `download_item` requests. Do not route normal join setup through `acquisition.rs`/SteamCMD. Join first calls prepare; only a ready response proceeds to launch. Setup completion returns to an idle/ready state and requires a fresh Join click.

- [ ] **Step 5: Verify GREEN and commit**

Commit: `feat: add DZSA style Steam mod setup`.

---

### Task 5: Correct DayZ process/BattlEye flow and settings controls

**Files:**
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/settings.rs`
- Modify: `src-tauri/src/launcher.rs`
- Create: `src-tauri/src/dayz_process.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `lib/models.ts`
- Modify: `lib/api.ts`
- Modify: `components/app-shell.tsx`
- Test: `src-tauri/tests/settings.rs`
- Test: `src-tauri/tests/launcher.rs`
- Create: `src-tauri/tests/dayz_process.rs`
- Test: `tests/app-shell.test.tsx`

**Interfaces:**
- `LauncherSettings` adds `skipBattlEye: boolean` and `discordPresence: boolean` with false-safe defaults.
- Commands: `is_dayz_running`, `close_dayz`, `verify_mods`, `uninstall_all_mods`.
- Launch builder selects normal BattlEye or direct `DayZ_x64.exe` based on setting.

- [ ] **Step 1: Write failing tests**

Rust settings round-trip must preserve the new booleans and load old JSON with defaults. Launcher tests assert BattlEye OFF path uses `DayZ_BE.exe` and Skip BattlEye ON uses `DayZ_x64.exe` without the BE bootstrap prefix. Frontend test asserts DayZ-running Join shows `DayZ is currently running. Would you like to close it?` and does not launch until close succeeds.

- [ ] **Step 2: Verify RED**

Run targeted Rust/frontend tests.

- [ ] **Step 3: Implement process-safe launch**

Detect DayZ/BE processes before join. If running, UI prompts Close DayZ/Cancel; `close_dayz` waits for termination and errors instead of launching a second instance. Build the correct launch command based on Skip BattlEye. Add Figma Settings controls: DayZ path, in-game name, Skip BattlEye, Discord Presence, Verify Mods, Uninstall All Mods, Refresh. Uninstall All Mods uses a stronger confirmation.

- [ ] **Step 4: Verify GREEN and commit**

Commit: `fix: make DayZ launch and settings DZSA style`.

---

### Task 6: Live ping, played-on timestamps, Rich Presence, updater, and packaging

**Files:**
- Create: `src-tauri/src/ping.rs`
- Modify: `src-tauri/src/collections.rs`
- Create: `src-tauri/src/presence.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/updates.rs`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `.github/workflows/release.yml`
- Modify: `components/update-panel.tsx`
- Modify: `components/app-shell.tsx`
- Modify: `app/globals.css`
- Modify: `src-tauri/icons/icon.ico.b64` using the approved Monarch M asset representation during implementation
- Test: `src-tauri/tests/collections.rs`
- Create: `src-tauri/tests/ping.rs`
- Test: `src-tauri/tests/updates.rs`
- Test: `tests/update-ui.test.tsx`
- Test: `tests/app-shell.test.tsx`

**Interfaces:**
- Command `ping_server(server) -> Option<u32>` or focused request/result equivalent.
- Recent/Played On records include a last-played timestamp without breaking older stored collection files.
- Presence service exposes browsing and playing states and is disabled when setting is false.

- [ ] **Step 1: Write failing tests**

Ping tests cover successful latency conversion and unreachable result. Collections tests cover last-played timestamp persistence/backward compatibility. Frontend tests cover bottom-left updater and Played On details. Updater tests cover release-build pubkey configuration behavior without the current runtime `Automatic updates are not configured in this build.` path.

- [ ] **Step 2: Verify RED**

Run targeted suites.

- [ ] **Step 3: Implement live services**

Ping individual visible servers asynchronously without blocking initial rendering. Record Last Played after successful launch. Integrate Discord Rich Presence controlled by the setting and restore browsing presence after DayZ exits. Move updater UI to bottom-left. Configure the updater public key through the release build/Tauri config pipeline instead of requiring a missing runtime environment value. Keep GitHub Releases as distribution.

- [ ] **Step 4: Apply Monarch assets**

Use the provided Monarch M as app/installer icon and the provided OGG as the launcher click sound. Do not use generic replacement branding.

- [ ] **Step 5: Full verification**

Run in CI:

```text
npm run typecheck
npm test
npm run build:web
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build -- --bundles nsis
```

Expected: all PASS; Windows launcher remains running in smoke test.

- [ ] **Step 6: Commit**

Commit: `feat: finish Monarch launcher desktop services`

## Self-review

- Spec coverage: all requested UI, mod setup, password, DayZ process, settings, ping, updater, sound, Rich Presence and packaging requirements map to Tasks 1-6.
- No country UI is reintroduced.
- Missing-mod flow explicitly uses Steamworks/signed-in Steam and requires Join again.
- Password remains ephemeral.
- Per-mod Update state remains local.
- All behavior changes have a test-first RED/GREEN step.
