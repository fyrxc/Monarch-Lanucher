# DZSA-Style Server Join Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Monarch's JOIN flow into a DZSA-style server preflight with clean server rows, copy/key React icons, required Workshop mod states and Steam-managed setup, and password-protected server joining.

**Architecture:** Keep the public directory and DayZ launching in the existing Tauri/Rust backend. Add a small required-mod status contract backed by local Workshop discovery plus Steamworks UGC state. React opens a join preflight for modded or passworded servers, polls mod state while Steam installs/updates content, and only calls launch after required mods are verified and a required password is present.

**Tech Stack:** Next.js / React / TypeScript, react-icons, Vitest, Tauri 2, Rust, Steamworks UGC.

**Spec:** Existing Monarch launcher requirements approved in the server-join design discussion; extends `docs/superpowers/plans/2026-08-28-workshop-mod-sync.md` and `docs/superpowers/plans/2026-08-29-runtime-performance-and-mod-management.md`.

## Global Constraints

- Keep server pagination at exactly 100 rows.
- Do not show country in the server row.
- IP + game port must have a React copy icon.
- Passworded servers must show a React key icon and collect the password before launch.
- Required mods show one of exactly: `Installed`, `Missing`, `Updating`.
- Missing/outdated server mods are handed to Steam Workshop; Monarch does not claim success until local Workshop state verifies them.
- Required Workshop load order remains server-provided order.
- Existing updater, favorites, recent servers, Steam name fallback, and Workshop management behavior remain intact.
- Verification includes frontend typecheck/tests/build, Rust fmt/clippy/tests, NSIS build, and startup smoke test through GitHub Actions.

---

### Task 1: Define failing server-join UI tests

**Files:**
- Modify: `tests/app-shell.test.tsx`

**Interfaces:**
- Requires future API methods `getRequiredMods(server)`, `syncRequiredMods(server)`, and `launchServer(server, password?)`.

- [ ] Add a locked-server test that requires password input before launch.
- [ ] Add required-mod tests for Installed, Missing, and Updating labels.
- [ ] Add server-row assertions for address/copy affordance and no country text.
- [ ] Push test-only changes and confirm the PR verification fails for missing implementation.

### Task 2: Add password-safe DayZ launch arguments

**Files:**
- Modify: `src-tauri/tests/launcher.rs`
- Modify: `src-tauri/src/launcher.rs`
- Modify: `src-tauri/src/commands.rs`

**Interfaces:**
- Produce `build_dayz_launch_command_with_password(..., password: Option<&str>)` while preserving the existing no-password wrapper.
- Change Tauri `launch_server` to accept `password: Option<String>`.

- [ ] Add failing Rust tests for `-password=` and control-character rejection.
- [ ] Implement minimal password argument support.
- [ ] Require a non-empty password when `server.is_passworded`.
- [ ] Run Rust launcher tests in CI.

### Task 3: Expose required Workshop states and Steam setup

**Files:**
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/workshop/steamworks_ugc.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `lib/models.ts`
- Modify: `lib/api.ts`

**Interfaces:**
- Produce `RequiredMod { workshopId, name, previewUrl, state }` where state is `installed | missing | updating`.
- Produce `get_required_mods(server)` and `sync_required_mods(server)` commands.
- Add Steamworks `subscribe(workshop_id)` and reuse `request_update`.

- [ ] Map each server-required Workshop ID in server order.
- [ ] Use local discovery plus Steamworks flags to classify state.
- [ ] Subscribe missing items and request downloads/updates through Steamworks.
- [ ] Never mark an item Installed solely because Steam accepted a request.

### Task 4: Build DZSA-style join preflight and clean server rows

**Files:**
- Create: `components/server-join-dialog.tsx`
- Modify: `components/server-table.tsx`
- Modify: `components/app-shell.tsx`
- Modify: `app/globals.css`
- Modify: `package.json`

**Interfaces:**
- `ServerTable` receives `onCopyAddress` only through an internal copy button; JOIN remains `onJoin(server)`.
- `ServerJoinDialog` receives required mods, password state, sync/refresh/join callbacks.

- [ ] Add `react-icons`.
- [ ] Replace text star/address affordances as appropriate and add `FiCopy`/`FiKey`.
- [ ] Remove country from the row.
- [ ] Open preflight for passworded or modded servers.
- [ ] Poll required-mod status while Missing/Updating after setup starts.
- [ ] Enable JOIN only when all required mods are Installed and password requirements are satisfied.

### Task 5: Verify and finish

**Files:**
- No behavior changes unless verification finds a root cause.

- [ ] Run/inspect GitHub Actions frontend typecheck/tests/build.
- [ ] Run/inspect Rust fmt/clippy/tests.
- [ ] Confirm NSIS installer build succeeds.
- [ ] Confirm startup smoke test keeps the launcher running.
- [ ] Review PR diff before integration.
