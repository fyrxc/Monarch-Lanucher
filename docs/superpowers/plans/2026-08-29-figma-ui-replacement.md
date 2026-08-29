# Monarch Full Figma UI Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every AI-made visible launcher component and rebuild the Monarch Launcher frontend from the user's Figma/screens and exact SVG assets while preserving the working Rust/Steam/DayZ backend and fixing the reported runtime issues before producing a verified Windows installer.

**Architecture:** Keep `LauncherApi`, Rust commands, Steamworks integration, server data, launch logic, settings persistence, updater logic, and session lifecycle as the behavior boundary. Replace the visible React presentation with new Figma-owned components and CSS. Move cross-cutting behavior such as Steam startup gating, live collection reconciliation, ping status colors, automatic persistence, and progressive Workshop enrichment into small testable utilities/hooks rather than embedding them in presentation markup.

**Tech Stack:** Next.js, React, TypeScript, CSS Modules, react-icons, Tauri 2, Rust, Steamworks, `discord-rich-presence`, Windows NSIS.

**Spec:** `docs/superpowers/specs/2026-08-29-figma-ui-replacement-design.md`

## Global Constraints

- None of the previous AI-created visible shell, table/dashboard styling, cards, headers, drawers, spacing system, or branding implementation may survive or be reused.
- Working backend/data logic may be reused behind brand-new visible components.
- Use the supplied `LogoWhite.svg` and `onarch.svg` directly; do not recreate Monarch branding as PNG/data URL/text.
- No server pagination/pages anywhere.
- Favorites sort to the top of the main Servers list.
- Favorites and Played On display current live server data when resolvable.
- Ping uses centralized DZSA-style green / yellow-orange / red / muted status colors.
- Steam must be open and available before Monarch becomes operational.
- Settings persist automatically; no Save Settings button.
- Mods first paint must not wait on slow metadata enrichment.
- Mods auto-refresh and show real queued/downloading/updating state.
- Mod Info shows creator + Steam link + progress/actions and no Workshop description.
- Click sound uses the supplied `Header_Click_UI.mp4` at a clearly louder volume than the current build.
- Discord Application ID is `1543377507770826762`.
- Windows helper processes must never flash CMD windows.
- Final gate is typecheck, all frontend tests, production web build, rustfmt, Clippy with warnings denied, all Rust tests, NSIS installer build, startup smoke test, and artifact upload.

---

### Task 1: Delete the old visible frontend contract and lock replacement tests

**Files:**
- Create: `tests/full-ui-replacement.test.tsx`
- Modify: `tests/app-shell.test.tsx`
- Modify: `tests/figma-shell-replacement.test.tsx`
- Delete after replacement: obsolete AI-only visible component/CSS files that are no longer imported

**Interfaces:**
- Tests consume `AppShell` through the existing `LauncherApi` mock boundary.
- Produces a regression contract proving the old generic dashboard shell cannot return.

- [ ] Add a failing test that rejects old generic shell copy/classes/structure and requires the exact SVG-backed Monarch brand.
- [ ] Add a failing test requiring the compact left rail with Servers / Favorite / Played On / Mods.
- [ ] Add a failing test requiring no server page controls to exist even with more than 100 servers.
- [ ] Run focused tests and confirm RED against the current UI.
- [ ] Do not implement presentation in this task; commit the regression contract.

### Task 2: Add exact brand assets and rebuild the shell from blank presentation components

**Files:**
- Create: `public/branding/LogoWhite.svg`
- Create: `public/branding/onarch.svg`
- Create: `components/monarch-shell.tsx`
- Create: `components/monarch-shell.module.css`
- Create: `components/monarch-navigation.tsx`
- Create: `components/monarch-navigation.module.css`
- Modify: `components/app-shell.tsx`
- Modify: `app/globals.css`
- Delete: old `components/navigation.tsx` and old branding presentation once imports are removed
- Delete/stop using: old `lib/branding.ts` data-URL presentation exports
- Test: `tests/full-ui-replacement.test.tsx`

**Interfaces:**
- `MonarchShell` receives current view, navigation callback, settings callback, and page content.
- `MonarchNavigation` preserves existing `LauncherView` semantics so backend routing state does not change.

- [ ] Materialize the supplied SVG contents exactly into `public/branding`.
- [ ] Build the new compact Figma shell using only new components/classes.
- [ ] Compose `LogoWhite.svg` + `onarch.svg` with the user's proportions/alignment.
- [ ] Move settings trigger into the Figma shell without generic dashboard header copy.
- [ ] Remove old shell markup/imports from `AppShell`.
- [ ] Run focused replacement tests GREEN.
- [ ] Delete now-unreferenced old shell/navigation/branding presentation files and rerun tests.
- [ ] Commit.

### Task 3: Rebuild server list, favorites, search, ping colors, and Server Info

**Files:**
- Create: `components/monarch-server-filters.tsx`
- Create: `components/monarch-server-filters.module.css`
- Create: `components/monarch-server-list.tsx`
- Create: `components/monarch-server-list.module.css`
- Create: `components/monarch-server-info.tsx`
- Create: `components/monarch-server-info.module.css`
- Create/Modify: `lib/live-server-collections.ts`
- Create: `lib/ping-status.ts`
- Modify: `components/app-shell.tsx`
- Delete after replacement: old `server-filters.*`, `server-table.*`, `server-info-panel.*` if unreferenced
- Test: `tests/live-collections.test.ts`
- Test: `tests/server-search-behavior.test.tsx`
- Test: `tests/server-details.test.tsx`
- Create: `tests/ping-colors.test.ts`

**Interfaces:**
- `reconcileServerCollection(saved, live)` returns live-backed saved collections.
- `sortServersWithFavoritesFirst(servers, favoriteIds)` returns a stable favorite-first list.
- `pingStatus(ping: number | null)` returns `good | medium | bad | unavailable`.
- New server list keeps existing favorite/info/join callbacks.

- [ ] Add RED tests for favorites sorting first and zero pagination with large server sets.
- [ ] Add RED tests for Favorite/Played On live 2/60 -> 30/60 reconciliation.
- [ ] Add RED tests for ping status thresholds and unavailable state.
- [ ] Implement centralized sorting/reconciliation/ping helpers.
- [ ] Rebuild filters/list with the compact Figma server layout and no page controls.
- [ ] Apply ping status classes without blocking asynchronous ping updates.
- [ ] Rebuild Server Info in the user's drawer language while preserving join/copy/mod status behavior.
- [ ] Run focused tests GREEN.
- [ ] Delete obsolete server presentation files and commit.

### Task 4: Require Steam before launcher operation and hide Windows helper consoles

**Files:**
- Modify: `src-tauri/src/steam.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/process.rs`
- Modify: `src-tauri/src/lib.rs` only if command registration changes
- Create: `components/steam-required.tsx`
- Create: `components/steam-required.module.css`
- Modify: `components/app-shell.tsx`
- Test: create/update Rust Steam/process tests
- Create: `tests/steam-required.test.tsx`
- Test: `tests/windows-subsystem.test.ts`

**Interfaces:**
- Add/confirm `SystemStatus` distinguishes Steam installed from Steam client currently available/running.
- `AppShell` blocks operational content when Steam is unavailable and retries through `getSystemStatus()`.

- [ ] Add RED Rust/frontend tests for Steam-closed startup gate.
- [ ] Implement Steam availability detection without starting Steam or using SteamCMD fallback.
- [ ] Add Monarch-styled blocking retry UI.
- [ ] Audit every Windows helper `Command` and apply `CREATE_NO_WINDOW`/hidden startup flags.
- [ ] Add regression tests for no-window helpers.
- [ ] Run focused frontend + Rust tests GREEN and commit.

### Task 5: Rebuild Mods for instant first paint and automatic Steam state refresh

**Files:**
- Create: `components/monarch-mods.tsx`
- Create: `components/monarch-mods.module.css`
- Create: `components/monarch-mod-card.tsx`
- Create: `components/monarch-mod-card.module.css`
- Create: `components/monarch-mod-preview.tsx`
- Modify: `lib/workshop-preview.ts`
- Modify: `components/app-shell.tsx`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/workshop/steamworks_ugc.rs`
- Delete after replacement: old `mods-view.*`, `mod-card.*`, `mod-preview.tsx` if unreferenced
- Test: `tests/mods-daily-driver.test.tsx`
- Test: `tests/mods-live-state.test.tsx`
- Test: `tests/mod-preview.test.tsx`
- Create: `tests/mods-first-paint.test.tsx`

**Interfaces:**
- Initial Mods render uses already-known/local catalog immediately.
- Background enrichment updates metadata/progress without replacing the whole grid.
- Steam subscribed/downloading items are included before final directory completion.

- [ ] Add RED test proving Mods content appears while metadata enrichment promise remains unresolved.
- [ ] Add RED test proving Steam add/remove/update is reflected automatically while Mods is open.
- [ ] Keep generic Workshop placeholder/broken image -> Monarch M fallback.
- [ ] Implement immediate local render followed by background enrichment.
- [ ] Keep localized per-mod progress state and automatic refresh polling/event loop.
- [ ] Ensure server-required mod setup uses signed-in Steamworks only.
- [ ] Run focused tests GREEN.
- [ ] Delete obsolete mod grid presentation files and commit.

### Task 6: Rebuild Mod Info and reliable download status

**Files:**
- Create: `components/monarch-mod-info.tsx`
- Create: `components/monarch-mod-info.module.css`
- Create: `components/monarch-download-status.tsx`
- Create: `components/monarch-download-status.module.css`
- Modify: `src-tauri/src/workshop/metadata.rs`
- Modify: `src-tauri/src/workshop/steamworks_ugc.rs`
- Modify: `lib/models.ts`
- Modify: `lib/api.ts`
- Delete after replacement: old `mod-info-panel.*` if unreferenced
- Test: `tests/mods-daily-driver.test.tsx`
- Test: `tests/workshop-progress.test.tsx`
- Create: `tests/mod-info-simplified.test.tsx`

**Interfaces:**
- `InstalledMod`/metadata exposes creator when Steam metadata provides it.
- Mod Info displays name, creator, Steam link, progress/state, update/open-folder/uninstall actions; description is not rendered.

- [ ] Add RED test asserting creator + Steam link are visible and Workshop description is absent.
- [ ] Add RED test asserting queued/downloading state renders before byte totals.
- [ ] Extend metadata model/API for creator.
- [ ] Rebuild Mod Info from blank presentation components.
- [ ] Implement download status states and real byte/percent display.
- [ ] Keep `Ready — press Join again` after server-required downloads and never auto-launch.
- [ ] Run focused tests GREEN and commit.

### Task 7: Rebuild Settings with immediate persistence

**Files:**
- Create: `components/monarch-settings.tsx`
- Create: `components/monarch-settings.module.css`
- Modify: `components/app-shell.tsx`
- Modify: `lib/models.ts` only if persistence contract requires it
- Delete after replacement: old `settings-content.*` if unreferenced
- Test: `tests/settings-daily-driver.test.tsx`
- Create: `tests/settings-autosave.test.tsx`

**Interfaces:**
- Settings UI calls a patch/update callback.
- `AppShell` merges settings with a functional state update and persists changes immediately/debounced without a Save button.

- [ ] Add RED test proving no Save Settings button exists and edits persist automatically.
- [ ] Rebuild Settings in the user's compact drawer layout.
- [ ] Preserve DayZ install-folder normalization, Steam persona fallback, Skip BattlEye, Discord Presence, Verify Mods, Uninstall All Mods, Refresh.
- [ ] Implement stable auto-save that does not lose rapid field changes.
- [ ] Keep preloaded settings so drawer open has no first-load flash.
- [ ] Run focused tests GREEN, delete obsolete Settings presentation files, commit.

### Task 8: Use MP4 click sound, louder playback, exact Discord app ID, and correct app icon

**Files:**
- Modify: `lib/click-sound.ts`
- Modify: `lib/use-global-click-sound.ts`
- Add/materialize: `public/sounds/Header_Click_UI.mp4`
- Modify: `scripts/materialize-assets.mjs` if source is stored as text/base64 in repo
- Modify: `src-tauri/src/presence.rs`
- Modify: `.github/workflows/verify.yml`
- Modify: release workflow if present
- Modify: `src-tauri/build.rs`
- Modify: `src-tauri/icons/icon.ico.b64` or generated icon source
- Test: `tests/click-sound.test.ts`
- Add/update Rust Presence tests
- Create/update asset/icon tests

**Interfaces:**
- Click playback volume is explicitly greater than the previous default and clamped <= 1.0.
- Build uses Discord App ID `1543377507770826762`.
- Presence remains non-fatal if Discord is unavailable.

- [ ] Add RED test for MP4 source and louder explicit volume.
- [ ] Materialize/use the supplied MP4 and keep central click targeting exclusions.
- [ ] Set verification/release build Discord App ID to `1543377507770826762`.
- [ ] Keep Monarch M rich presence asset key/payload and non-fatal IPC failures.
- [ ] Generate/materialize the Windows multi-resolution icon from supplied M artwork so taskbar/installer rendering is not tiny.
- [ ] Run focused frontend/Rust tests GREEN and commit.

### Task 9: Remove all obsolete AI presentation files and verify no imports remain

**Files:**
- Delete every old visible component/CSS file no longer imported after Tasks 2-8.
- Modify: `tests/full-ui-replacement.test.tsx`

**Interfaces:**
- Source tree must compile with only the new Monarch presentation components.

- [ ] Search imports for each obsolete old presentation module.
- [ ] Delete unreferenced old UI files rather than leaving them available to drift back in.
- [ ] Add static regression assertions for forbidden old shell/header copy and obsolete component imports.
- [ ] Run full frontend test suite and production web build.
- [ ] Commit.

### Task 10: Version, full Windows verification, and verified EXE

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`
- Modify visible version source if separate
- Modify code/tests only for proven verification failures

**Interfaces:**
- One frozen branch commit must pass the complete verification workflow before artifact handoff.

- [ ] Bump the replacement build version consistently.
- [ ] Run/trigger full CI on the frozen commit.
- [ ] Require TypeScript typecheck success.
- [ ] Require all frontend tests success.
- [ ] Require production static frontend build success.
- [ ] Require Rust format check success.
- [ ] Require Clippy `-D warnings` success.
- [ ] Require all Rust tests success.
- [ ] Require Tauri Windows NSIS installer success.
- [ ] Require 5-second launcher startup smoke test success.
- [ ] Require setup EXE artifact upload success.
- [ ] Download the exact artifact, extract the EXE, compute SHA-256, and provide that verified build to the user.