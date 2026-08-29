# Monarch Figma UI Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visible Monarch Launcher frontend with the user's Figma/screens while preserving the working Rust/Steam/DayZ backend, and fix the reported live server/mod/sound/Rich Presence behaviors before producing a verified Windows installer.

**Architecture:** Keep `LauncherApi` and Rust commands as the behavior boundary. Rebuild presentation components and CSS around the user's compact Monarch layout. Add small reconciliation/progress/media utilities so UI state comes from live server/Steam data rather than persisted snapshots.

**Tech Stack:** Next.js, React, TypeScript, CSS Modules, react-icons, Tauri 2, Rust, Steamworks, Windows NSIS.

**Spec:** `docs/superpowers/specs/2026-08-29-figma-ui-replacement-design.md`

## Global Constraints

- The previous AI-created layout must not be blended back into the visible UI.
- Keep working Rust/Steam/DayZ backend behavior unless a reported bug requires a backend fix.
- Branding inside the launcher uses Monarch M + `onarch`; app/fallback art uses the transparent M.
- Server search shows all matches and no pagination.
- Favorites and Played On display current live directory data when resolvable.
- Mods auto-refresh and show real queued/downloading/updating status.
- Click sound uses the user-supplied `Header_Click_UI.mp4`.
- Discord Presence defaults on and failure must never break launcher startup.
- Windows helper processes must remain hidden.
- Final gate is typecheck, frontend tests, production web build, rustfmt, Clippy, Rust tests, NSIS build, startup smoke test, artifact upload.

---

### Task 1: Lock live server collection behavior

**Files:**
- Create: `lib/live-server-collections.ts`
- Modify: `components/app-shell.tsx`
- Modify: `lib/use-live-server-ping.ts`
- Test: `tests/live-collections.test.ts`
- Test: `tests/search-pagination.test.tsx`

**Interfaces:**
- Produces `reconcileServerCollection(saved: DayzServer[], live: DayzServer[]): DayzServer[]`.
- AppShell uses reconciled Favorites/Played On and pings whichever server collection is visible.

- [ ] Write failing tests proving a saved 2/60 server becomes 30/60 from the live directory and missing live entries fall back to saved snapshots.
- [ ] Write failing UI test proving non-empty search renders all matches without page controls.
- [ ] Implement identity-based reconciliation using `serverIdentity`.
- [ ] Update AppShell to render reconciled collections and disable pagination for non-empty search.
- [ ] Update live ping targeting to Servers/Favorites/Played On visible rows.
- [ ] Run focused frontend tests and commit.

### Task 2: Replace the shell/server presentation with Monarch UI

**Files:**
- Modify: `components/navigation.tsx`
- Modify: `components/server-table.tsx`
- Modify: `components/server-table.module.css`
- Modify: `components/app-shell.tsx`
- Modify: `app/globals.css`
- Create/Modify: branding/header CSS or component files as needed
- Test: `tests/app-shell.test.tsx`
- Test: `tests/server-details.test.tsx`

**Interfaces:**
- Navigation keeps existing `LauncherView` values.
- ServerTable keeps existing behavior callbacks while changing visible structure.

- [ ] Write/update tests for M + `onarch` branding, compact navigation, compact server list and info/open/join controls.
- [ ] Remove old generic page headers/toolbars/marketing copy from visible shell.
- [ ] Rebuild sidebar/content proportions around supplied Monarch screens.
- [ ] Rebuild server row/table styling without changing join/favorite semantics.
- [ ] Run focused frontend tests and commit.

### Task 3: Replace Mods and Mod Info presentation

**Files:**
- Modify: `components/mods-view.tsx`
- Modify: `components/mods-view.module.css`
- Modify: `components/mod-card.tsx`
- Modify: `components/mod-card.module.css`
- Modify: `components/mod-info-panel.tsx`
- Modify: `components/mod-info-panel.module.css`
- Modify: `lib/workshop-preview.ts`
- Test: `tests/mods-daily-driver.test.tsx`
- Test: `tests/mod-preview.test.tsx`
- Test: `tests/mods-live-state.test.tsx`

**Interfaces:**
- Keep existing Steam API methods.
- Cards and Mod Info receive localized progress from `ModsView`.

- [ ] Update tests to require Monarch-layout mod cards and right-side Mod Info drawer.
- [ ] Ensure generic DayZ Workshop placeholder and broken image both resolve to Monarch M.
- [ ] Show Steam Workshop link in Mod Info.
- [ ] Show queued/updating status immediately before byte totals exist.
- [ ] Keep localized byte/percent polling and automatic installed-mod list refresh.
- [ ] Run focused frontend tests and commit.

### Task 4: Replace Settings presentation

**Files:**
- Modify: `components/settings-content.tsx`
- Modify: `components/settings-content.module.css`
- Modify: drawer/shared panel CSS
- Test: `tests/settings-daily-driver.test.tsx`

**Interfaces:**
- Keep `LauncherSettings` and existing settings API.

- [ ] Update tests for the user's compact Settings layout and all required controls.
- [ ] Rebuild Settings visual structure without generic AI cards/headers.
- [ ] Keep DayZ folder normalization, auto-detection, Steam persona fallback, Skip BattlEye, Discord Presence, Verify, Uninstall All, Refresh.
- [ ] Run focused frontend tests and commit.

### Task 5: Switch central click sound to MP4

**Files:**
- Add binary asset: `public/assets/Header_Click_UI.mp4`
- Modify: `lib/click-sound.ts` and/or `lib/use-global-click-sound.ts`
- Test: `tests/click-sound.test.ts`

**Interfaces:**
- Central click handler remains the only click-sound trigger.

- [ ] Write failing test requiring the MP4 asset URL and excluding disabled/text-entry clicks.
- [ ] Add the supplied MP4 asset.
- [ ] Use an `HTMLAudioElement`/media element compatible source pointed at the MP4, reset playback time and play centrally.
- [ ] Run focused tests and commit.

### Task 6: Fix real Discord Rich Presence runtime

**Files:**
- Modify: `src-tauri/src/discord_presence.rs` or current presence module
- Modify: `src-tauri/src/commands.rs`/`lib.rs` only if command wiring requires it
- Modify: `.github/workflows/verify.yml`/release workflow only if build-time app ID wiring is missing
- Test: current/new Rust Discord Presence tests

**Interfaces:**
- Presence methods remain optional/non-fatal from frontend.
- Payload uses large image key `monarch_m` and large text `Monarch Launcher`.

- [ ] Add/extend Rust tests for default enabled state and desired payload.
- [ ] Trace runtime connection and ensure configured Discord Application ID reaches the build.
- [ ] Make connection/update failures return safely without breaking launcher behavior.
- [ ] Run Rust tests and commit.

### Task 7: Final regression and Windows release

**Files:**
- Modify tests/code only for proven failures.
- Bump version for the new build consistently in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, and visible version text.

- [ ] Run full CI on one frozen commit.
- [ ] Fix any frontend failure and rerun.
- [ ] Fix any rustfmt/Clippy/Rust test failure and rerun.
- [ ] Require NSIS installer success.
- [ ] Require launcher startup smoke test success.
- [ ] Require setup artifact upload.
- [ ] Download the exact artifact and provide that verified EXE to the user.