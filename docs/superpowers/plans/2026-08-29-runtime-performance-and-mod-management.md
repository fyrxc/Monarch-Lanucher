# Monarch Launcher Runtime and Mod Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public server browser responsive, reliably launch DayZ through BattlEye, default the DayZ name to the active Steam PersonaName, and replace the Mods page with Steam Workshop-aware cards and safe Steam-managed update/unsubscribe actions.

**Architecture:** Keep the server directory cached but paginate the rendered view. Move Windows/Steam-specific behavior behind focused Rust modules: direct BattlEye command construction, Steam profile parsing, public Workshop metadata lookup, and a Steamworks UGC service. The React shell consumes enriched models and exposes small commands for Update, Open Folder, and Uninstall.

**Tech Stack:** Next.js 16 / React, TypeScript, Tauri 2, Rust 1.98, reqwest 0.12, steamworks 0.13.1, Steam Workshop public metadata API, Windows Explorer.

**Spec:** `docs/superpowers/specs/2026-08-29-runtime-performance-and-mod-management-design.md`

## Global Constraints

- Branch: `rewrite/nextjs-rust`.
- Server page size is exactly 100 rows.
- JOIN executable sequence is `DayZ_BE.exe 0 1 1 -exe DayZ_x64.exe` followed by DayZ arguments.
- Required Workshop paths remain in server-provided order.
- A saved non-empty DayZ name always overrides Steam PersonaName.
- Steam PersonaName detection is best-effort and must never block startup.
- Proper mod removal uses Steamworks UGC unsubscribe; do not silently fall back to deleting Workshop folders.
- Public Workshop metadata failure must degrade to local name/path cards.
- Missing server-mod auto-subscription remains out of scope.
- Existing updater behavior remains unchanged.
- Verification must include frontend typecheck/tests/build, Rust fmt/clippy/tests, NSIS build, and launcher startup smoke test.

---

### Task 1: Paginated, responsive server browser

**Files:**
- Create: `lib/pagination.ts`
- Modify: `components/app-shell.tsx`
- Modify: `components/server-table.tsx`
- Modify: `app/globals.css`
- Test: `tests/pagination.test.ts`
- Test: `tests/app-shell.test.tsx`

**Interfaces:**
- Produces: `paginate<T>(items: readonly T[], page: number, pageSize: number): { items: T[]; page: number; pageCount: number; total: number }`.
- Produces: Servers view rendering at most 100 rows while retaining the full filtered result count.

- [ ] **Step 1: Write failing pagination tests**

```ts
import { describe, expect, it } from "vitest";
import { paginate } from "../lib/pagination";

describe("paginate", () => {
  it("returns only the requested 100-row page", () => {
    const values = Array.from({ length: 250 }, (_, index) => index + 1);
    const result = paginate(values, 2, 100);
    expect(result.items).toHaveLength(100);
    expect(result.items[0]).toBe(101);
    expect(result.items[99]).toBe(200);
    expect(result.pageCount).toBe(3);
    expect(result.total).toBe(250);
  });

  it("clamps a page that is past the end", () => {
    const result = paginate([1, 2, 3], 9, 100);
    expect(result.page).toBe(1);
    expect(result.items).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 2: Run pagination test and confirm failure**

Run: `npm test -- tests/pagination.test.ts`
Expected: FAIL because `lib/pagination.ts` does not exist.

- [ ] **Step 3: Implement pagination helper**

```ts
export function paginate<T>(items: readonly T[], page: number, pageSize: number) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageCount,
    total,
  };
}
```

- [ ] **Step 4: Add deferred search and 100-row page state**

In `components/app-shell.tsx` import `useDeferredValue`, add `const SERVER_PAGE_SIZE = 100`, `serverPage`, and use a deferred copy of `filters.search` when calculating `visibleServers`. Reset `serverPage` to 1 whenever filter state changes. Pass only the page slice to `ServerTable` while `ServerFiltersPanel.resultCount` receives the full filtered count.

- [ ] **Step 5: Add Previous/Next page controls**

Render a `.server-pagination` block beneath the table with disabled Previous/Next buttons and text `Page X of Y · N servers`.

- [ ] **Step 6: Memoize server table**

Wrap `ServerTable` with `memo` and keep `favoriteIds`, `joiningId`, `servers`, `onFavorite`, and `onJoin` as its only inputs.

- [ ] **Step 7: Add/adjust frontend tests**

Add an app-shell fixture with more than 100 generated servers and assert only 100 JOIN buttons are rendered on page 1 and the page indicator reports the complete count.

- [ ] **Step 8: Run frontend tests**

Run: `npm test -- tests/pagination.test.ts tests/app-shell.test.tsx`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/pagination.ts components/app-shell.tsx components/server-table.tsx app/globals.css tests/pagination.test.ts tests/app-shell.test.tsx
git commit -m "perf: paginate public server browser"
```

---

### Task 2: Direct BattlEye JOIN command

**Files:**
- Modify: `src-tauri/src/steam.rs`
- Modify: `src-tauri/src/launcher.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/models.rs`
- Test: `src-tauri/tests/launcher.rs`
- Test: `src-tauri/tests/steam.rs`

**Interfaces:**
- Extend `SteamPaths` with `dayz_root: Option<PathBuf>` and `dayz_be_exe: Option<PathBuf>` while retaining `dayz_exe` for `DayZ_x64.exe`.
- Produce `DayzLaunchCommand { executable: PathBuf, working_directory: PathBuf, args: Vec<String> }`.
- Produce `build_dayz_launch_command(server, settings, installed_mods, dayz_root) -> Result<DayzLaunchCommand, String>`.

- [ ] **Step 1: Write failing BattlEye launch-command test**

```rust
#[test]
fn builds_battleye_bootstrap_command() {
    let root = std::path::PathBuf::from(r"C:\Steam\steamapps\common\DayZ");
    let command = build_dayz_launch_command(&server(), &LauncherSettings::default(), &[], &root)
        .expect("build command");

    assert_eq!(command.executable, root.join("DayZ_BE.exe"));
    assert_eq!(command.working_directory, root);
    assert_eq!(&command.args[0..5], ["0", "1", "1", "-exe", "DayZ_x64.exe"]);
    assert!(command.args.iter().any(|arg| arg == "-connect=1.2.3.4"));
    assert!(command.args.iter().any(|arg| arg == "-port=2302"));
}
```

- [ ] **Step 2: Run test and confirm failure**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test launcher builds_battleye_bootstrap_command`
Expected: FAIL because the command type/function does not exist.

- [ ] **Step 3: Refactor DayZ-only arguments**

Keep current validation/mod-order logic but split it into `build_dayz_args_with_mods(...)` returning only `-connect`, `-port`, optional `-name`, optional `-mod`, and extras. `build_dayz_launch_command` prepends the exact BattlEye bootstrap args.

- [ ] **Step 4: Extend Steam discovery**

When `DayZ_x64.exe` exists, set `dayz_root` to its parent and discover `DayZ_BE.exe` from the same folder. Add tests over a temporary Steam library layout to verify both paths.

- [ ] **Step 5: Change `launch_server` process spawning**

Replace `Command::new(&steam.steam_exe).args(...)` with:

```rust
Command::new(&command.executable)
    .current_dir(&command.working_directory)
    .args(&command.args)
    .spawn()
    .map_err(|error| format!("failed to launch DayZ BattlEye bootstrap: {error}"))?;
```

Return explicit errors when either `DayZ_x64.exe` or `DayZ_BE.exe` is missing.

- [ ] **Step 6: Preserve Recent semantics**

Call `record_recent` only after `spawn()` returns success.

- [ ] **Step 7: Run launcher/Steam tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test launcher --test steam`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/steam.rs src-tauri/src/launcher.rs src-tauri/src/commands.rs src-tauri/src/models.rs src-tauri/tests/launcher.rs src-tauri/tests/steam.rs
git commit -m "fix: launch DayZ through BattlEye bootstrap"
```

---

### Task 3: Active Steam PersonaName fallback

**Files:**
- Create: `src-tauri/src/steam_profile.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/models.rs`
- Modify: `lib/models.ts`
- Modify: `components/app-shell.tsx`
- Test: `src-tauri/tests/steam_profile.rs`
- Test: `tests/app-shell.test.tsx`

**Interfaces:**
- Produce `parse_persona_name(loginusers_vdf: &str) -> Option<String>`.
- Produce `detect_persona_name(steam_root: &Path) -> Option<String>`.
- Extend `SystemStatus`/`SystemStatus` TS model with `steamPersonaName: string | null`.
- Produce `effective_dayz_name(settings: &LauncherSettings, persona_name: Option<&str>) -> String`.

- [ ] **Step 1: Write failing VDF parser tests**

```rust
#[test]
fn most_recent_account_wins() {
    let body = r#"
    "users" {
      "1" { "PersonaName" "OldName" "MostRecent" "0" }
      "2" { "PersonaName" "PublicName" "MostRecent" "1" }
    }"#;
    assert_eq!(parse_persona_name(body).as_deref(), Some("PublicName"));
}

#[test]
fn first_named_account_is_fallback() {
    let body = r#""users" { "1" { "PersonaName" "FallbackName" } }"#;
    assert_eq!(parse_persona_name(body).as_deref(), Some("FallbackName"));
}
```

- [ ] **Step 2: Run parser tests and confirm failure**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test steam_profile`
Expected: FAIL because module/functions do not exist.

- [ ] **Step 3: Implement a small token-based KeyValues parser**

Parse quoted string tokens and braces, inspect each direct account object for `PersonaName` and `MostRecent`, choose `MostRecent == "1"` first, otherwise first non-empty PersonaName.

- [ ] **Step 4: Add best-effort detection to system status**

Read `<SteamRoot>/config/loginusers.vdf`; detection errors become `None`, not command errors.

- [ ] **Step 5: Use PersonaName during JOIN**

Before building DayZ args, load settings and if `settings.dayz_name.trim().is_empty()`, clone settings and fill `dayz_name` with detected PersonaName. Never overwrite a non-empty saved setting.

- [ ] **Step 6: Populate Settings UI fallback**

When Settings loads, if `nextSettings.dayzName` is empty and `status.steamPersonaName` is non-empty, display that PersonaName in the input. Saving persists it only if the user clicks Save.

- [ ] **Step 7: Run Rust and frontend tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test steam_profile`
Run: `npm test -- tests/app-shell.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/steam_profile.rs src-tauri/src/lib.rs src-tauri/src/commands.rs src-tauri/src/models.rs lib/models.ts components/app-shell.tsx src-tauri/tests/steam_profile.rs tests/app-shell.test.tsx
git commit -m "feat: default DayZ name from Steam persona"
```

---

### Task 4: Workshop metadata and Steamworks UGC backend

**Files:**
- Create: `src-tauri/src/workshop/metadata.rs`
- Create: `src-tauri/src/workshop/steamworks_ugc.rs`
- Modify: `src-tauri/src/workshop/mod.rs`
- Modify: `src-tauri/src/workshop/discovery.rs`
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`
- Test: `src-tauri/tests/workshop_metadata.rs`
- Test: `src-tauri/tests/workshop_actions.rs`

**Interfaces:**
- Add dependency `steamworks = "0.13.1"`.
- Extend `InstalledMod` with `preview_url: Option<String>`, `needs_update: bool`, `is_downloading: bool`, `is_subscribed: bool`.
- Produce `fetch_published_file_details(client: &reqwest::Client, workshop_ids: &[String]) -> Result<HashMap<String, WorkshopMetadata>, String>`.
- Produce `SteamWorkshopService::initialize() -> Result<Self, String>` using `steamworks::Client::init_app(steamworks::AppId(221100))`.
- Produce `item_status(&self, workshop_id: &str) -> Result<WorkshopItemStatus, String>`.
- Produce `request_update(&self, workshop_id: &str) -> Result<(), String>`.
- Produce `unsubscribe(&self, workshop_id: &str) -> Result<(), String>` that waits for the Steam callback with a bounded timeout while pumping callbacks.

- [ ] **Step 1: Write failing metadata normalization test**

Use a saved JSON response fixture representing Steam `publishedfiledetails` and assert ID/title/preview URL extraction plus graceful omission of failed entries.

- [ ] **Step 2: Run metadata test and confirm failure**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test workshop_metadata`
Expected: FAIL because metadata module does not exist.

- [ ] **Step 3: Implement public metadata fetch**

POST form fields to `https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/` using `itemcount=N` and `publishedfileids[0]=...`. Parse only `result == 1` entries and map `publishedfileid`, `title`, and `preview_url`.

- [ ] **Step 4: Add Steamworks dependency and focused service**

Use steamworks 0.13.1. Convert the item ID with `PublishedFileId(workshop_id.parse::<u64>()?)`. Derive state from `ugc.item_state(id)` flags: `NEEDS_UPDATE`, `DOWNLOADING | DOWNLOAD_PENDING`, and `SUBSCRIBED`.

- [ ] **Step 5: Implement Update**

Call `ugc.download_item(id, true)`. Return an error when it returns false; otherwise return success meaning Steam accepted the update request. The UI refreshes state after the request rather than pretending the download is already complete.

- [ ] **Step 6: Implement proper Unsubscribe**

Call `ugc.unsubscribe_item(id, callback)`, communicate callback result through `std::sync::mpsc`, pump `client.run_callbacks()` every 50 ms, and time out after 10 seconds with `Steam did not confirm Workshop unsubscribe within 10 seconds.`.

- [ ] **Step 7: Enrich installed mod results**

`get_installed_mods` first discovers local items, batch-fetches metadata, then attempts one Steamworks service initialization. If Steamworks initialization fails, keep cards but set action status fields conservatively and return a separate availability/error field via a new `InstalledModsResult { mods, steamworks_available, steamworks_error }` model.

- [ ] **Step 8: Add safe folder opening**

Implement `open_workshop_mod_folder(workshop_id)` by rediscovering installed mods, finding the exact ID, then running `explorer.exe <validated path>`. Never accept a frontend-provided arbitrary path.

- [ ] **Step 9: Add Tauri commands**

Register `update_workshop_mod`, `unsubscribe_workshop_mod`, and `open_workshop_mod_folder`. Update/unsubscribe take only a Workshop ID string and validate it as positive numeric input.

- [ ] **Step 10: Run backend tests and build check**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test workshop_metadata --test workshop_actions`
Run: `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src-tauri/src/workshop src-tauri/src/models.rs src-tauri/src/commands.rs src-tauri/src/lib.rs src-tauri/Cargo.toml src-tauri/tests/workshop_metadata.rs src-tauri/tests/workshop_actions.rs
git commit -m "feat: add Steam Workshop management backend"
```

---

### Task 5: Rounded Workshop Mods UI

**Files:**
- Create: `components/mod-card.tsx`
- Create: `components/mod-card.module.css`
- Modify: `components/app-shell.tsx`
- Modify: `lib/api.ts`
- Modify: `lib/models.ts`
- Test: `tests/mods-ui.test.tsx`
- Modify: `tests/app-shell.test.tsx`

**Interfaces:**
- `LauncherApi.getInstalledMods(): Promise<InstalledModsResult>`.
- `LauncherApi.updateWorkshopMod(workshopId: string): Promise<void>`.
- `LauncherApi.unsubscribeWorkshopMod(workshopId: string): Promise<void>`.
- `LauncherApi.openWorkshopModFolder(workshopId: string): Promise<void>`.
- `ModCard` consumes one enriched `InstalledMod` and action callbacks.

- [ ] **Step 1: Write failing Mods UI test**

Render an `InstalledModsResult` containing a mod with preview URL, name, path, and `needsUpdate: true`; assert the preview image, title, Workshop ID, path, UPDATE, OPEN FOLDER, and UNINSTALL controls are present.

- [ ] **Step 2: Run test and confirm failure**

Run: `npm test -- tests/mods-ui.test.tsx`
Expected: FAIL because enriched UI/actions do not exist.

- [ ] **Step 3: Update TS models/API bridge**

Mirror Rust camelCase fields and add Tauri invokes named exactly `update_workshop_mod`, `unsubscribe_workshop_mod`, and `open_workshop_mod_folder`.

- [ ] **Step 4: Build rounded `ModCard` component**

Use an `<img>` with Workshop preview when present, neutral `WORKSHOP` placeholder when absent, rounded 18–22px card corners, title/ID/path metadata, and three compact action buttons. Disable UPDATE when `needsUpdate` is false or a download is already active.

- [ ] **Step 5: Add unsubscribe confirmation**

On first UNINSTALL click switch the card into a confirmation state with copy `Unsubscribe this mod from Steam Workshop?` and Confirm/Cancel buttons. Only Confirm calls the backend.

- [ ] **Step 6: Wire refresh/status behavior**

After Update, Open Folder, or successful Unsubscribe, surface a status message. Refresh mods after Update/Unsubscribe. If `steamworksAvailable` is false, disable Update/Uninstall and show the returned Steamworks error above the cards.

- [ ] **Step 7: Run Mods/frontend tests**

Run: `npm test -- tests/mods-ui.test.tsx tests/app-shell.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/mod-card.tsx components/mod-card.module.css components/app-shell.tsx lib/api.ts lib/models.ts tests/mods-ui.test.tsx tests/app-shell.test.tsx
git commit -m "feat: redesign DayZ Workshop mods page"
```

---

### Task 6: Full Windows verification and replacement installer

**Files:**
- Modify only if needed after verification: `.github/workflows/verify.yml`

**Interfaces:**
- Consumes all prior tasks.
- Produces a CI-built `MonarchLauncher-Setup.exe` artifact from the exact verified branch head.

- [ ] **Step 1: Run local/CI-equivalent frontend verification**

Run:
```bash
npm run typecheck
npm test
npm run build:web
```
Expected: all pass.

- [ ] **Step 2: Run Rust verification**

Run:
```bash
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```
Expected: all pass.

- [ ] **Step 3: Build Windows installer**

Run: `npm run tauri build -- --bundles nsis`
Expected: NSIS setup executable is produced.

- [ ] **Step 4: Run startup smoke test**

Launch `src-tauri/target/release/monarch_launcher.exe`, wait five seconds, fail if it exits, otherwise stop it. This is the existing CI regression check for startup panics.

- [ ] **Step 5: Download and inspect GitHub Actions artifact**

Verify the workflow conclusion is success and artifact `MonarchLauncher-Setup` belongs to the final branch head SHA.

- [ ] **Step 6: User runtime verification on Windows**

Install the replacement build and verify these runtime-only cases:
1. Servers opens without the previous large-table freeze and search typing remains responsive.
2. JOIN starts `DayZ_BE.exe` and DayZ connects to a real chosen server.
3. Settings shows the active Steam public PersonaName by default when no custom name exists.
4. Mods cards show Workshop metadata/images where available.
5. Update requests a Steam Workshop update.
6. Uninstall unsubscribes through Steam and the mod no longer remains subscribed.

No claim of live DayZ/Steamworks runtime success is made until these are observed on the user's PC.
