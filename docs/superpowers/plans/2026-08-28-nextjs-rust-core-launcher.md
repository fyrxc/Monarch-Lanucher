# Next.js + Rust Core Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Monarch Lanucher rewrite with a Next.js frontend, Rust backend, Tauri 2 desktop shell, automatic public DayZ servers, filters, favorites/recent, settings, Steam/DayZ discovery, direct join, and local logging.

**Architecture:** Next.js is a static UI only. Every Windows-native operation lives in Rust behind thin Tauri commands. Rust modules own server discovery, persistence, Steam/DayZ discovery, launch argument construction, and logging; shared serializable models form the frontend/backend contract.

**Tech Stack:** Next.js App Router, TypeScript, React, Tailwind CSS, Tauri 2, Rust stable, serde, reqwest, tokio, tracing, tracing-appender, dirs, url, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-28-nextjs-rust-rewrite-design.md`

## Global Constraints

- Frontend is Next.js; backend/native code is Rust.
- Tauri 2 is the desktop shell and command/event bridge.
- Windows is the only initial packaging target.
- Next.js must export static assets; no production Node.js server ships with the desktop app.
- The old C#/WPF implementation is not copied into the new app architecture.
- The app opens directly to Servers and contains no dashboard/home page.
- No fake/sample server rows may appear in production.
- Native filesystem, registry, process, Steam, DayZ, and persistence work must stay out of React components.
- Branch pushes verify only; releases are not created from feature branches.

---

## File Structure Locked By This Plan

```text
app/
  globals.css
  layout.tsx
  page.tsx
components/
  app-shell.tsx
  navigation.tsx
  server-filters.tsx
  server-table.tsx
  status-banner.tsx
  pages/favorites-page.tsx
  pages/recent-page.tsx
  pages/mods-page.tsx
  pages/settings-page.tsx
lib/
  api.ts
  filters.ts
  models.ts
  navigation.ts
  stores.ts
src-tauri/
  Cargo.toml
  tauri.conf.json
  src/
    main.rs
    lib.rs
    error.rs
    models.rs
    commands/mod.rs
    servers/mod.rs
    steam/mod.rs
    launcher/mod.rs
    settings/mod.rs
    collections/mod.rs
    logging/mod.rs
  tests/fixtures/
tests/
  filters.test.ts
  app-shell.test.tsx
.github/workflows/
  verify.yml
package.json
next.config.ts
tsconfig.json
vitest.config.ts
```

### Task 1: Scaffold the static Next.js + Tauri 2 application and branch CI

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`
- Create: `.github/workflows/verify.yml`

**Interfaces:**
- Consumes: none.
- Produces: a static-export Next.js app, a Tauri 2 Rust crate named `monarch_launcher`, and a Windows verification workflow used by every later task.

- [ ] **Step 1: Create the frontend package manifest**

Use scripts that separate frontend verification from Tauri verification:

```json
{
  "name": "monarch-lanucher",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build:web": "next build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2",
    "next": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "jsdom": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Configure static export**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true }
};

export default nextConfig;
```

- [ ] **Step 3: Create the smallest frontend smoke test**

`tests/app-shell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import Page from "../app/page";

it("opens on the Servers experience", () => {
  render(<Page />);
  expect(screen.getByText("Servers")).toBeInTheDocument();
});
```

- [ ] **Step 4: Run the frontend test and confirm the first red state**

Run: `npm test -- tests/app-shell.test.tsx`
Expected: FAIL until `app/page.tsx` renders a Servers heading.

- [ ] **Step 5: Add the minimal Next.js page and Vitest setup**

`app/page.tsx`:

```tsx
export default function Page() {
  return <main><h1>Servers</h1></main>;
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"]
  }
});
```

`tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 6: Add the minimal Tauri 2 crate**

`src-tauri/src/main.rs`:

```rust
fn main() {
    monarch_launcher::run();
}
```

`src-tauri/src/lib.rs`:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Monarch Lanucher");
}
```

- [ ] **Step 7: Configure Tauri to use the static export**

Set `frontendDist` to `../out`, `beforeBuildCommand` to `npm run build:web`, product name to `Monarch Lanucher`, identifier to `com.monarch.launcher`, and Windows bundle targets to `nsis` only for local development packaging.

- [ ] **Step 8: Add branch verification workflow**

Workflow steps on `windows-latest`:

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: npm
- run: npm ci
- run: npm run typecheck
- run: npm test
- run: npm run build:web
- uses: dtolnay/rust-toolchain@stable
  with:
    components: rustfmt, clippy
- run: cargo fmt --manifest-path src-tauri/Cargo.toml --check
- run: cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
- run: cargo test --manifest-path src-tauri/Cargo.toml
- run: npm run tauri build -- --no-bundle
```

- [ ] **Step 9: Run local/static checks where available and push for Windows CI**

Run: `npm ci && npm run typecheck && npm test && npm run build:web`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json next.config.ts tsconfig.json vitest.config.ts app tests src-tauri .github/workflows/verify.yml
git commit -m "feat: scaffold Next.js Tauri Rust launcher"
```

### Task 2: Define the Rust/TypeScript contract and server filtering model

**Files:**
- Create: `src-tauri/src/models.rs`
- Create: `src-tauri/src/error.rs`
- Create: `lib/models.ts`
- Create: `lib/filters.ts`
- Create: `tests/filters.test.ts`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Produces Rust `DayzServer`, `LauncherSettings`, `InstalledMod`, `SystemStatus`, `ServerDirectoryResult`, and `LauncherError`.
- Produces TypeScript mirrors `DayzServer`, `LauncherSettings`, `InstalledMod`, `SystemStatus`, and `ServerFilters`.
- Produces `filterServers(servers: DayzServer[], filters: ServerFilters): DayzServer[]`.

- [ ] **Step 1: Write failing TypeScript filter tests**

```ts
import { filterServers } from "../lib/filters";
import type { DayzServer } from "../lib/models";

const base: DayzServer = {
  id: "1",
  name: "Monarch EU",
  map: "chernarusplus",
  players: 42,
  maxPlayers: 100,
  ping: 45,
  ip: "1.2.3.4",
  gamePort: 2302,
  queryPort: 2303,
  status: "online",
  passworded: false,
  official: false,
  firstPersonOnly: true,
  modded: true,
  country: "DE",
  requiredWorkshopIds: ["1559212036"]
};

it("filters by search, player count, ping and mode", () => {
  const result = filterServers([base], {
    search: "monarch",
    map: "chernarusplus",
    minPlayers: 20,
    maxPlayers: 80,
    maxPing: 60,
    hideEmpty: true,
    hideFull: true,
    modded: true,
    passworded: null,
    official: false,
    firstPersonOnly: true,
    favoritesOnly: false
  });
  expect(result).toHaveLength(1);
});
```

- [ ] **Step 2: Run the filter test and verify it fails**

Run: `npm test -- tests/filters.test.ts`
Expected: FAIL because `lib/filters.ts` and models do not exist.

- [ ] **Step 3: Implement the shared models and filter predicate**

`lib/filters.ts` must compare text case-insensitively against name/map/`ip:gamePort`, treat `null` tri-state values as “either”, and never exclude a server on ping when ping is `null`.

- [ ] **Step 4: Add Rust serialization tests**

In `src-tauri/src/models.rs`:

```rust
#[test]
fn dayz_server_serializes_frontend_field_names() {
    let server = DayzServer::fixture();
    let value = serde_json::to_value(server).unwrap();
    assert_eq!(value["gamePort"], 2302);
    assert!(value["requiredWorkshopIds"].is_array());
}
```

Use `#[serde(rename_all = "camelCase")]` on frontend-facing structures.

- [ ] **Step 5: Run both frontend and Rust tests**

Run: `npm test -- tests/filters.test.ts`
Run: `cargo test --manifest-path src-tauri/Cargo.toml models`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib src-tauri/src/models.rs src-tauri/src/error.rs src-tauri/src/lib.rs tests/filters.test.ts
git commit -m "feat: define launcher data contract and filters"
```

### Task 3: Implement automatic public DayZ server discovery in Rust

**Files:**
- Create: `src-tauri/src/servers/mod.rs`
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/tests/fixtures/dayz-servers.json`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

**Interfaces:**
- Produces trait `ServerDirectory` with async `fetch_servers(&self) -> Result<ServerDirectoryResult, LauncherError>`.
- Produces `DzsaServerDirectory` backed by `reqwest::Client`.
- Produces Tauri command `get_servers() -> Result<ServerDirectoryResult, String>`.

- [ ] **Step 1: Add a fixture containing valid, malformed, duplicate, vanilla, and modded rows**

Use the provider response shape with `name`, `players`, `maxPlayers`, `map`, `password`, `firstPersonOnly`, `mods`, `endpoint.ip`, `endpoint.port`, and `gamePort`.

- [ ] **Step 2: Write failing Rust mapping tests**

```rust
#[tokio::test]
async fn maps_valid_rows_skips_bad_rows_and_deduplicates() {
    let body = include_str!("../tests/fixtures/dayz-servers.json");
    let result = servers::parse_directory(body).unwrap();
    assert_eq!(result.servers.len(), 2);
    assert_eq!(result.servers[0].required_workshop_ids, vec!["1559212036"]);
}
```

- [ ] **Step 3: Run the server tests and verify the red state**

Run: `cargo test --manifest-path src-tauri/Cargo.toml servers`
Expected: FAIL because `servers::parse_directory` does not exist.

- [ ] **Step 4: Implement provider parsing and normalization**

Normalize missing map to `"DayZ"`, query port to `gamePort + 1` when absent, status to `"online"` when absent, and Workshop IDs to decimal strings. Skip rows without a name, IP, or valid game port. Deduplicate by provider ID when present, otherwise by `ip:gamePort`.

- [ ] **Step 5: Implement network fetch with bounded timeout**

Construct a `reqwest::Client` with a 10-second request timeout. Convert non-success HTTP statuses to `LauncherError::ServerDirectory`. Return parsed valid rows even when malformed rows were skipped; set `warning` when rows were skipped.

- [ ] **Step 6: Register `get_servers` as a Tauri command**

Keep `commands::get_servers` as a thin wrapper around shared state containing `Arc<dyn ServerDirectory + Send + Sync>`.

- [ ] **Step 7: Run Rust tests and clippy**

Run: `cargo test --manifest-path src-tauri/Cargo.toml servers`
Run: `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src-tauri
git commit -m "feat: add automatic DayZ server directory"
```

### Task 4: Add settings, favorites, recent servers, and local logging

**Files:**
- Create: `src-tauri/src/settings/mod.rs`
- Create: `src-tauri/src/collections/mod.rs`
- Create: `src-tauri/src/logging/mod.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Produces `SettingsStore::load/save` using JSON in the Tauri local app-data directory.
- Produces `CollectionsStore::favorites/toggle_favorite/recent/add_recent/clear_recent`.
- Produces Tauri commands `get_settings`, `save_settings`, `get_favorites`, `toggle_favorite`, `get_recent`, `clear_recent`, `open_logs_folder`.

- [ ] **Step 1: Write failing settings and collections tests using temporary directories**

```rust
#[test]
fn settings_round_trip_dayz_name() {
    let dir = tempfile::tempdir().unwrap();
    let store = SettingsStore::new(dir.path().to_path_buf());
    store.save(&LauncherSettings { dayz_name: "Crashout".into(), extra_launch_parameters: String::new() }).unwrap();
    assert_eq!(store.load().unwrap().dayz_name, "Crashout");
}

#[test]
fn recent_is_unique_newest_first_and_bounded() {
    let dir = tempfile::tempdir().unwrap();
    let store = CollectionsStore::new(dir.path().to_path_buf());
    store.add_recent(server("1")).unwrap();
    store.add_recent(server("2")).unwrap();
    store.add_recent(server("1")).unwrap();
    assert_eq!(store.recent().unwrap()[0].id, "1");
}
```

- [ ] **Step 2: Run targeted Rust tests and verify they fail**

Run: `cargo test --manifest-path src-tauri/Cargo.toml settings collections`
Expected: FAIL because stores do not exist.

- [ ] **Step 3: Implement atomic-ish JSON persistence**

Write to `<file>.tmp`, flush, then replace the target file. Missing files return defaults. Corrupt files return a structured persistence error and are not silently overwritten.

- [ ] **Step 4: Implement favorite/recent identity rules**

Identity is provider ID when non-empty, otherwise `ip:gamePort`. Recent limit is 20. `toggle_favorite` returns the resulting favorite state.

- [ ] **Step 5: Initialize tracing before window/native work**

Write rolling daily logs under `<local_app_data>/Monarch Lanucher/logs`. Log technical causes in Rust; return user-safe strings through Tauri commands.

- [ ] **Step 6: Run persistence tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml settings collections logging`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/settings src-tauri/src/collections src-tauri/src/logging src-tauri/src/commands src-tauri/src/lib.rs
git commit -m "feat: persist launcher settings and server collections"
```

### Task 5: Add Steam/DayZ discovery and safe direct server launch

**Files:**
- Create: `src-tauri/src/steam/mod.rs`
- Create: `src-tauri/src/launcher/mod.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

**Interfaces:**
- Produces `SteamPaths { steam_exe, library_roots, dayz_install }`.
- Produces `discover_steam() -> Result<SteamPaths, LauncherError>`.
- Produces `build_launch_args(server, settings, mod_paths) -> Vec<String>`.
- Produces `launch_server(server) -> Result<(), LauncherError>` Tauri command; a successful process start records Recent.

- [ ] **Step 1: Write failing VDF parsing tests**

Create a sample `libraryfolders.vdf` string containing `C:\\Program Files (x86)\\Steam` and `D:\\SteamLibrary`, then assert both roots are returned once.

- [ ] **Step 2: Write failing launch argument tests**

```rust
#[test]
fn launch_args_include_server_and_escaped_profile_name() {
    let args = build_launch_args(&server("1.2.3.4", 2302), &settings("Crash Out"), &[]);
    assert!(args.contains(&"-connect=1.2.3.4".to_string()));
    assert!(args.contains(&"-port=2302".to_string()));
    assert!(args.contains(&"-name=Crash Out".to_string()));
}
```

Use `std::process::Command::arg` for each argument so Windows quoting is delegated to the standard library instead of manually concatenating an untrusted command string.

- [ ] **Step 3: Run tests and confirm the red state**

Run: `cargo test --manifest-path src-tauri/Cargo.toml steam launcher`
Expected: FAIL because discovery/launch helpers do not exist.

- [ ] **Step 4: Implement registry and fallback Steam discovery**

On Windows, read `HKCU\\Software\\Valve\\Steam` values `SteamExe` and `SteamPath`. Fall back to `%ProgramFiles(x86)%\\Steam\\steam.exe`. Parse `steamapps/libraryfolders.vdf` for additional roots.

- [ ] **Step 5: Detect DayZ installation**

Check each library for `steamapps/common/DayZ/DayZ_x64.exe`. Report `DayZ not installed` if no executable exists.

- [ ] **Step 6: Implement direct launch through Steam**

Start `steam.exe` with separate args: `-applaunch`, `221100`, `-connect=<ip>`, `-port=<port>`, optional `-name=<saved name>`, optional validated extra parameters. Reject CR/LF/NUL in user-provided extra parameters.

- [ ] **Step 7: Record Recent only after process start succeeds**

Call `CollectionsStore::add_recent` after `Command::spawn()` returns `Ok`.

- [ ] **Step 8: Run Rust tests and clippy**

Run: `cargo test --manifest-path src-tauri/Cargo.toml steam launcher`
Run: `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src-tauri
git commit -m "feat: discover Steam and launch DayZ servers"
```

### Task 6: Build the polished server-first Next.js UI and wire Tauri commands

**Files:**
- Create: `lib/api.ts`
- Create: `lib/navigation.ts`
- Create: `lib/stores.ts`
- Create: `components/app-shell.tsx`
- Create: `components/navigation.tsx`
- Create: `components/server-filters.tsx`
- Create: `components/server-table.tsx`
- Create: `components/status-banner.tsx`
- Create: `components/pages/favorites-page.tsx`
- Create: `components/pages/recent-page.tsx`
- Create: `components/pages/mods-page.tsx`
- Create: `components/pages/settings-page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/app-shell.test.tsx`

**Interfaces:**
- `lib/api.ts` is the only frontend file that calls Tauri `invoke`.
- `AppShell` owns selected navigation key and page-level loading/error state.
- `ServerTable` receives rows and callback props only; it does not invoke Rust directly.

- [ ] **Step 1: Expand the frontend test to cover the required navigation**

```tsx
it("renders the five launcher sections without a Home dashboard", () => {
  render(<AppShell api={fakeApi} />);
  for (const label of ["Servers", "Favorites", "Recent", "Mods", "Settings"])
    expect(screen.getByText(label)).toBeInTheDocument();
  expect(screen.queryByText("Home")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the UI test and verify it fails**

Run: `npm test -- tests/app-shell.test.tsx`
Expected: FAIL because `AppShell` does not exist.

- [ ] **Step 3: Implement typed Tauri API wrappers**

Export functions exactly matching the Rust commands: `getServers`, `getFavorites`, `toggleFavorite`, `getRecent`, `clearRecent`, `getSettings`, `saveSettings`, `getSystemStatus`, and `launchServer`.

- [ ] **Step 4: Implement compact launcher shell styling**

Use a dark charcoal background, 188–204px sidebar, one compact Monarch brand treatment at top-left, rounded 8–12px panels/buttons/inputs, thin neutral borders, and no large dashboard hero region.

- [ ] **Step 5: Implement Servers page**

Load automatically on first mount, show real loading/error/retry states, display search + DZSA-style filters, compute filtered rows locally via `filterServers`, and expose star/join row actions.

- [ ] **Step 6: Implement Favorites, Recent, Mods placeholder, and Settings pages**

Favorites and Recent use real backend data. Mods in Phase 1 shows an intentionally functional shell reading no fake data and copy `Workshop management is installed in Phase 2`. Settings edits DayZ name and extra launch parameters and displays detected Steam/DayZ status.

- [ ] **Step 7: Test empty/error/loading states**

Use a fake API object to assert `Loading DayZ servers…`, `No servers match these filters`, and a real error string plus Retry button.

- [ ] **Step 8: Run frontend verification**

Run: `npm run typecheck`
Run: `npm test`
Run: `npm run build:web`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add app components lib tests
git commit -m "feat: build Monarch server-first Next.js interface"
```

### Task 7: Run the full Phase 1 verification gate

**Files:**
- Modify only files required by failures found by verification.

**Interfaces:**
- Consumes the entire Phase 1 application.
- Produces a branch state that passes frontend, Rust, and Tauri Windows verification without creating a release.

- [ ] **Step 1: Run all frontend checks**

```bash
npm ci
npm run typecheck
npm test
npm run build:web
```

Expected: all commands exit 0.

- [ ] **Step 2: Run all Rust checks**

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: all commands exit 0 and Rust tests report zero failures.

- [ ] **Step 3: Run a Windows Tauri no-bundle build**

Run: `npm run tauri build -- --no-bundle`
Expected: the Windows executable build completes successfully.

- [ ] **Step 4: Push and verify `.github/workflows/verify.yml` on `rewrite/nextjs-rust`**

Expected: every CI step is green and no GitHub Release is created.

- [ ] **Step 5: Commit any verification-only corrections**

```bash
git add -A
git commit -m "fix: complete core launcher verification"
```

Do not create this commit when no corrections were required.
