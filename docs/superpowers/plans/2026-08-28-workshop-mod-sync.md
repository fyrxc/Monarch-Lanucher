# Workshop Mod Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add installed DayZ Workshop discovery, required-mod resolution, missing-mod planning, Steam-supported acquisition handoff, progress reporting, verification, and mod-aware launch to the rewritten launcher.

**Architecture:** Rust owns Workshop discovery and synchronization. Server models carry exact Workshop IDs when the server provider exposes them. The frontend shows sync state and never guesses whether a mod is installed; it reacts to Tauri command results/events emitted by Rust.

**Tech Stack:** Rust stable, Tauri 2 events/commands, serde, tokio, tracing, Next.js, TypeScript, React, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-28-nextjs-rust-rewrite-design.md`

## Global Constraints

- Frontend remains Next.js; backend/native work remains Rust.
- Use Steam-supported mechanisms for Workshop acquisition; do not implement a custom Workshop CDN downloader.
- Never claim a missing mod is installed until its local Workshop directory is verified.
- If the server provider cannot supply exact Workshop IDs, automatic sync must report unavailable rather than fake success.
- Mod load order must preserve the provider's required Workshop ID order.
- Broken/malformed Workshop folders must not crash the launcher.

---

## File Structure Locked By This Plan

```text
src-tauri/src/
  workshop/
    mod.rs
    discovery.rs
    sync.rs
  steam/mod.rs
  launcher/mod.rs
  commands/mod.rs
  models.rs
components/
  mod-sync-dialog.tsx
  pages/mods-page.tsx
lib/
  api.ts
  models.ts
  mod-sync.ts
tests/
  mod-sync.test.ts
src-tauri/tests/fixtures/
  libraryfolders.vdf
  appworkshop_221100.acf
```

### Task 1: Preserve exact server Workshop IDs in the normalized server contract

**Files:**
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/servers/mod.rs`
- Modify: `lib/models.ts`
- Test: existing server fixture tests

**Interfaces:**
- Produces ordered `required_workshop_ids: Vec<String>` in Rust and `requiredWorkshopIds: string[]` in TypeScript.

- [ ] **Step 1: Add a failing server mapping test for ordered IDs**

```rust
#[test]
fn preserves_required_workshop_id_order() {
    let body = r#"{
      \"status\":0,
      \"result\":[{
        \"name\":\"Modded\",
        \"players\":1,
        \"maxPlayers\":60,
        \"map\":\"chernarusplus\",
        \"endpoint\":{\"ip\":\"1.2.3.4\",\"port\":2303},
        \"gamePort\":2302,
        \"mods\":[
          {\"name\":\"CF\",\"steamWorkshopId\":1559212036},
          {\"name\":\"VPP\",\"steamWorkshopId\":1828439124}
        ]
      }]
    }"#;
    let result = parse_directory(body).unwrap();
    assert_eq!(result.servers[0].required_workshop_ids, vec!["1559212036", "1828439124"]);
}
```

- [ ] **Step 2: Run targeted server tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml servers`
Expected: FAIL if IDs are missing or unordered.

- [ ] **Step 3: Implement exact ordered mapping**

Ignore invalid/non-positive IDs. Deduplicate repeated IDs while preserving first occurrence order.

- [ ] **Step 4: Run tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml servers`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/models.rs src-tauri/src/servers/mod.rs lib/models.ts
git commit -m "feat: preserve required DayZ Workshop IDs"
```

### Task 2: Discover installed Workshop mods across every Steam library

**Files:**
- Create: `src-tauri/src/workshop/mod.rs`
- Create: `src-tauri/src/workshop/discovery.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/commands/mod.rs`

**Interfaces:**
- Produces `InstalledMod { workshop_id, name, path }`.
- Produces `discover_installed_mods(&SteamPaths) -> Result<Vec<InstalledMod>, LauncherError>`.
- Produces Tauri command `get_installed_mods`.

- [ ] **Step 1: Write failing discovery tests with temporary Steam libraries**

```rust
#[test]
fn finds_mods_across_multiple_libraries() {
    let temp = tempfile::tempdir().unwrap();
    let a = temp.path().join("A/steamapps/workshop/content/221100/1559212036");
    let b = temp.path().join("B/steamapps/workshop/content/221100/1828439124");
    std::fs::create_dir_all(&a).unwrap();
    std::fs::create_dir_all(&b).unwrap();
    std::fs::write(a.join("meta.cpp"), "name = \"CF\";").unwrap();
    std::fs::write(b.join("meta.cpp"), "name = \"VPP\";").unwrap();

    let mods = discover_from_roots(&[temp.path().join("A"), temp.path().join("B")]).unwrap();
    assert_eq!(mods.len(), 2);
}
```

- [ ] **Step 2: Verify the discovery test fails**

Run: `cargo test --manifest-path src-tauri/Cargo.toml workshop::discovery`
Expected: FAIL because discovery functions do not exist.

- [ ] **Step 3: Implement directory scanning**

Scan `<library>/steamapps/workshop/content/221100/<numeric_id>`. Read `meta.cpp` and then `mod.cpp` for `name = "...";`; fall back to `Workshop <id>` when neither yields a name.

- [ ] **Step 4: Ignore malformed folders safely**

Non-numeric directories, unreadable metadata, and incomplete folders are skipped or represented with fallback names; they never panic.

- [ ] **Step 5: Add and register `get_installed_mods`**

The command discovers Steam first, then scans every returned library root.

- [ ] **Step 6: Run tests and clippy**

Run: `cargo test --manifest-path src-tauri/Cargo.toml workshop::discovery`
Run: `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src-tauri
git commit -m "feat: discover installed DayZ Workshop mods"
```

### Task 3: Build deterministic sync planning and verification

**Files:**
- Create: `src-tauri/src/workshop/sync.rs`
- Modify: `src-tauri/src/workshop/mod.rs`
- Modify: `src-tauri/src/models.rs`

**Interfaces:**
- Produces `ModSyncPlan { required, installed, missing }`.
- Produces `build_sync_plan(required_ids: &[String], installed: &[InstalledMod]) -> ModSyncPlan`.
- Produces `verify_required_mods(required_ids, installed) -> Result<Vec<InstalledMod>, LauncherError>` preserving required order.

- [ ] **Step 1: Write failing sync-plan tests**

```rust
#[test]
fn sync_plan_splits_installed_and_missing_in_server_order() {
    let required = vec!["1".into(), "2".into(), "3".into()];
    let installed = vec![installed("2"), installed("1")];
    let plan = build_sync_plan(&required, &installed);
    assert_eq!(plan.installed.iter().map(|m| m.workshop_id.as_str()).collect::<Vec<_>>(), vec!["1", "2"]);
    assert_eq!(plan.missing, vec!["3"]);
}
```

- [ ] **Step 2: Run test and verify failure**

Run: `cargo test --manifest-path src-tauri/Cargo.toml workshop::sync`
Expected: FAIL because the sync planner does not exist.

- [ ] **Step 3: Implement sync planning without filesystem side effects**

Use a `HashMap<&str, &InstalledMod>` for lookup but generate output by iterating the required ID list, preserving server order.

- [ ] **Step 4: Implement verification**

Verification succeeds only when every required ID maps to an existing local directory at the moment verification runs. Return `LauncherError::WorkshopMissing(Vec<String>)` otherwise.

- [ ] **Step 5: Run tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml workshop::sync`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/workshop src-tauri/src/models.rs
git commit -m "feat: plan and verify DayZ mod synchronization"
```

### Task 4: Add Steam-supported missing-mod acquisition handoff and progress events

**Files:**
- Modify: `src-tauri/src/workshop/sync.rs`
- Modify: `src-tauri/src/steam/mod.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/models.rs`
- Modify: `lib/models.ts`
- Modify: `lib/api.ts`

**Interfaces:**
- Produces `prepare_server_join(server) -> JoinPreparation`.
- Produces `sync_server_mods(server) -> Result<ModSyncResult, LauncherError>`.
- Emits `mod-sync-status` payload `{ stage, message, workshopId? }`.
- Emits `mod-sync-progress` payload `{ installed, required }`.

- [ ] **Step 1: Write failing command-level tests around a fake acquisition adapter**

Define a trait:

```rust
#[async_trait::async_trait]
pub trait WorkshopAcquirer: Send + Sync {
    async fn request_install(&self, workshop_id: &str) -> Result<(), LauncherError>;
}
```

Test that missing IDs are requested in required order and installed IDs are not requested.

- [ ] **Step 2: Run command tests and verify failure**

Run: `cargo test --manifest-path src-tauri/Cargo.toml workshop_acquisition`
Expected: FAIL because `WorkshopAcquirer` and sync command do not exist.

- [ ] **Step 3: Implement the production Steam handoff adapter**

Use the installed Steam client as the user-facing subscription/install authority. For each missing ID, open the official Steam Workshop item page using Steam's documented CommunityFilePage URI form:

```text
steam://url/CommunityFilePage/<WORKSHOP_ID>
```

The launcher then enters a polling state and re-scans installed Workshop directories every 2 seconds for up to 15 minutes. It does not treat opening the page as installation success.

- [ ] **Step 4: Surface the required user action explicitly**

When the Steam client opens the item page, emit status text `Subscribe in Steam if this mod is not already subscribed; Monarch will continue automatically when Steam finishes installing it.` This keeps the implementation inside Steam-supported subscription behavior and avoids collecting Steam credentials or Web API keys.

- [ ] **Step 5: Emit progress after each re-scan**

Count verified installed required IDs and emit `mod-sync-progress`. Cancel cleanly when the Tauri command's cancellation state is dropped or the app exits.

- [ ] **Step 6: Return timeout/missing errors with exact IDs**

After 15 minutes, return the unresolved Workshop IDs rather than claiming sync success.

- [ ] **Step 7: Run unit tests with a fake acquirer and fake scanner**

Run: `cargo test --manifest-path src-tauri/Cargo.toml workshop_acquisition`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src-tauri lib
git commit -m "feat: coordinate Steam Workshop mod acquisition"
```

### Task 5: Launch DayZ with verified required mod paths

**Files:**
- Modify: `src-tauri/src/launcher/mod.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/models.rs`

**Interfaces:**
- `launch_server` consumes verified `InstalledMod` rows in server-required order.
- `build_launch_args` appends one `-mod=<absolute1>;<absolute2>;...` argument when mods exist.

- [ ] **Step 1: Write a failing mod-path launch test**

```rust
#[test]
fn launch_args_keep_required_mod_order() {
    let mods = vec![installed_at("1", r"D:\\Steam\\...\\1"), installed_at("2", r"D:\\Steam\\...\\2")];
    let args = build_launch_args(&server("1.2.3.4", 2302), &settings("Crashout"), &mods);
    assert!(args.iter().any(|arg| arg == r"-mod=D:\\Steam\\...\\1;D:\\Steam\\...\\2"));
}
```

- [ ] **Step 2: Run launch tests and verify failure**

Run: `cargo test --manifest-path src-tauri/Cargo.toml launcher`
Expected: FAIL until mod paths are appended.

- [ ] **Step 3: Implement mod-aware launch**

For a modded server with exact IDs, verify every ID immediately before spawning Steam. For a server with `modded=true` but no exact IDs, return `Automatic mod synchronization is unavailable for this server.`

- [ ] **Step 4: Run launch tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml launcher`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/launcher src-tauri/src/commands src-tauri/src/models.rs
git commit -m "feat: launch DayZ with verified server mods"
```

### Task 6: Build Mods page and join-sync UI states

**Files:**
- Create: `components/mod-sync-dialog.tsx`
- Modify: `components/pages/mods-page.tsx`
- Modify: `components/server-table.tsx`
- Create: `lib/mod-sync.ts`
- Modify: `lib/api.ts`
- Create: `tests/mod-sync.test.ts`

**Interfaces:**
- Mods page loads `getInstalledMods()` and supports search/refresh.
- JOIN calls `prepareServerJoin`; vanilla servers launch directly, missing-mod servers open `ModSyncDialog`, verified modded servers launch directly.

- [ ] **Step 1: Write failing state-machine tests**

```ts
import { nextJoinState } from "../lib/mod-sync";

it("requires sync when the preparation contains missing mods", () => {
  expect(nextJoinState({ missingWorkshopIds: ["1559212036"], installedWorkshopIds: [] })).toBe("sync-required");
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/mod-sync.test.ts`
Expected: FAIL because the sync state helper does not exist.

- [ ] **Step 3: Implement explicit join states**

Use `idle | preparing | sync-required | syncing | ready | launching | error`. Never infer ready from progress percentage; only a successful Rust verification result sets ready.

- [ ] **Step 4: Build the Mods page**

Show installed mod display name, Workshop ID, path, count, search, and refresh. Empty state is `No installed DayZ Workshop mods were found.`

- [ ] **Step 5: Build the sync dialog**

Show required count, installed count, missing IDs, current status message, progress bar, Cancel, and `Open in Steam` context. The dialog listens for `mod-sync-status` and `mod-sync-progress` Tauri events.

- [ ] **Step 6: Wire JOIN through preparation/sync/launch**

If sync returns success, call launch. If sync returns unresolved IDs or timeout, keep the dialog open with the exact error.

- [ ] **Step 7: Run frontend checks**

Run: `npm run typecheck`
Run: `npm test`
Run: `npm run build:web`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components lib tests
git commit -m "feat: add DayZ Workshop sync interface"
```

### Task 7: Run the Phase 2 verification gate

**Files:**
- Modify only files required by verification failures.

- [ ] **Step 1: Run all frontend checks**

```bash
npm run typecheck
npm test
npm run build:web
```

Expected: all exit 0.

- [ ] **Step 2: Run all Rust checks**

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: zero failures.

- [ ] **Step 3: Run the Windows Tauri build**

Run: `npm run tauri build -- --no-bundle`
Expected: build exits 0.

- [ ] **Step 4: Verify feature-branch GitHub Actions**

Push `rewrite/nextjs-rust` and verify `.github/workflows/verify.yml` completes successfully without creating a release.
