# Next.js + Rust Core Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Monarch Lanucher rewrite with a Next.js frontend, Rust backend, Tauri 2 desktop shell, automatic public DayZ servers, DZSA-style filters, favorites/recent, settings, Steam/DayZ discovery, direct join, and local logging.

**Architecture:** Next.js is a static UI only. Rust owns server/network/native/persistence/process work behind thin Tauri commands. Shared serde/TypeScript models define the contract between them.

**Tech Stack:** Next.js App Router, TypeScript, React, Tailwind CSS, Tauri 2, Rust stable, serde, reqwest, tokio, tracing, dirs, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-28-nextjs-rust-rewrite-design.md`

## Global Constraints

- Frontend is Next.js; backend/native code is Rust.
- Tauri 2 is the desktop shell and bridge.
- Windows is the initial target.
- Next.js exports static assets; no production Node server ships.
- Old C#/WPF code is not copied into the new app.
- App opens directly to Servers; no Home/dashboard page.
- No fake production server rows.
- Native filesystem/registry/process/Steam/DayZ logic stays out of React.
- Feature-branch CI verifies only and never publishes a release.

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
  tests/fixtures/dayz-servers.json
tests/
  setup.ts
  filters.test.ts
  app-shell.test.tsx
.github/workflows/verify.yml
package.json
package-lock.json
next.config.ts
tsconfig.json
vitest.config.ts
```

### Task 1: Scaffold static Next.js + Tauri 2 and verification CI

**Files:**
- Create all root/frontend/Tauri scaffold files listed above except feature modules implemented in later tasks.

**Interfaces:**
- Produces static-export Next.js app.
- Produces Rust crate `monarch_launcher`.
- Produces Windows feature-branch verification workflow.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "monarch-lanucher",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build:web": "next build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
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

- [ ] **Step 2: Generate and commit the npm lockfile**

Run:

```bash
npm install
```

Expected: `package-lock.json` exists and records exact resolved versions.

- [ ] **Step 3: Configure static export**

`next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true }
};

export default nextConfig;
```

- [ ] **Step 4: Create minimal App Router files**

`app/layout.tsx`:

```tsx
import "./globals.css";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
```

`app/page.tsx`:

```tsx
export default function Page() {
  return <main><h1>Servers</h1></main>;
}
```

- [ ] **Step 5: Configure Vitest and write the first smoke test**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "jsdom", setupFiles: ["./tests/setup.ts"] }
});
```

`tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

`tests/app-shell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import Page from "../app/page";

it("starts on Servers", () => {
  render(<Page />);
  expect(screen.getByRole("heading", { name: "Servers" })).toBeInTheDocument();
});
```

- [ ] **Step 6: Create the Tauri crate**

`src-tauri/Cargo.toml` must define package `monarch_launcher`, edition `2021`, library crate types `staticlib`, `cdylib`, `rlib`, and dependencies `tauri = { version = "2", features = [] }` plus build dependency `tauri-build = "2"`.

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

- [ ] **Step 7: Configure Tauri static frontend**

Set `build.frontendDist` to `../out`, `build.beforeBuildCommand` to `npm run build:web`, product name `Monarch Lanucher`, identifier `com.monarch.launcher`, and bundle target `nsis`.

- [ ] **Step 8: Add `.github/workflows/verify.yml`**

On pushes/PRs, run Node 22 + `npm ci`, `npm run typecheck`, `npm test`, `npm run build:web`, Rust stable + rustfmt/clippy, `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`, and `npm run tauri build -- --no-bundle` on `windows-latest`.

- [ ] **Step 9: Run frontend verification**

```bash
npm run typecheck
npm test
npm run build:web
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json next.config.ts tsconfig.json vitest.config.ts app tests src-tauri .github/workflows/verify.yml
git commit -m "feat: scaffold Next.js Tauri Rust launcher"
```

### Task 2: Define shared models and client-side server filters

**Files:**
- Create: `src-tauri/src/models.rs`
- Create: `src-tauri/src/error.rs`
- Create: `lib/models.ts`
- Create: `lib/filters.ts`
- Create: `tests/filters.test.ts`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Rust models: `DayzServer`, `ServerDirectoryResult`, `LauncherSettings`, `InstalledMod`, `SystemStatus`.
- TypeScript mirrors use camelCase.
- `filterServers(servers, filters)` handles all DZSA-style local filters.

- [ ] **Step 1: Write failing filter tests**

Use a `DayzServer` fixture with name `Monarch EU`, map `chernarusplus`, 42/100 players, ping 45, modded true, first-person true. Assert search/map/min/max players/max ping/modded/official/first-person filters retain it, and `hideEmpty` removes a zero-player copy.

- [ ] **Step 2: Verify red state**

Run: `npm test -- tests/filters.test.ts`
Expected: FAIL because models/filter helper do not exist.

- [ ] **Step 3: Implement TypeScript models and pure filter helper**

Tri-state filters use `boolean | null`, where `null` means either. A missing ping (`null`) is not excluded by max-ping filtering. Search matches server name, map, and `ip:gamePort` case-insensitively.

- [ ] **Step 4: Implement Rust models with serde camelCase**

Use `#[serde(rename_all = "camelCase")]` on every frontend-facing structure. `DayzServer.required_workshop_ids` is `Vec<String>`.

- [ ] **Step 5: Add Rust serialization test**

Assert serialized `DayzServer` contains keys `gamePort` and `requiredWorkshopIds`.

- [ ] **Step 6: Run tests**

```bash
npm test -- tests/filters.test.ts
cargo test --manifest-path src-tauri/Cargo.toml models
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib src-tauri/src/models.rs src-tauri/src/error.rs src-tauri/src/lib.rs tests/filters.test.ts
git commit -m "feat: define launcher contract and server filters"
```

### Task 3: Implement automatic public DayZ server discovery in Rust

**Files:**
- Create: `src-tauri/src/servers/mod.rs`
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/tests/fixtures/dayz-servers.json`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

**Interfaces:**
- `ServerDirectory` trait exposes async `fetch_servers`.
- `DzsaServerDirectory` uses `reqwest::Client`.
- Tauri command `get_servers` returns normalized `ServerDirectoryResult`.

- [ ] **Step 1: Add provider fixture**

Fixture contains two valid servers, one malformed row, one duplicate, one modded server with ordered Workshop IDs `1559212036`, `1828439124`.

- [ ] **Step 2: Write failing parser test**

```rust
#[test]
fn maps_skips_and_deduplicates_directory_rows() {
    let body = include_str!("../../tests/fixtures/dayz-servers.json");
    let result = parse_directory(body).unwrap();
    assert_eq!(result.servers.len(), 2);
    assert_eq!(result.servers[0].required_workshop_ids, vec!["1559212036", "1828439124"]);
}
```

- [ ] **Step 3: Verify red state**

Run: `cargo test --manifest-path src-tauri/Cargo.toml servers`
Expected: FAIL because parser/provider do not exist.

- [ ] **Step 4: Implement parser**

Skip rows without name/IP/positive game port. Default map to `DayZ`, query port to game port + 1 when absent, status to `online`, dedupe by provider ID else `ip:gamePort`, and preserve first-seen Workshop ID order while removing invalid/duplicate IDs.

- [ ] **Step 5: Implement network provider**

Use a `reqwest::Client` with 10-second timeout against the public DayZ directory endpoint. Non-2xx becomes `LauncherError::ServerDirectory`. Malformed individual rows produce a warning while valid rows remain usable.

- [ ] **Step 6: Register `get_servers`**

Store an `Arc<dyn ServerDirectory + Send + Sync>` in Tauri state and keep the command wrapper free of parsing logic.

- [ ] **Step 7: Verify Rust checks**

```bash
cargo test --manifest-path src-tauri/Cargo.toml servers
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src-tauri
git commit -m "feat: add automatic DayZ server directory"
```

### Task 4: Add settings, favorites/recent, and local logging

**Files:**
- Create: `src-tauri/src/settings/mod.rs`
- Create: `src-tauri/src/collections/mod.rs`
- Create: `src-tauri/src/logging/mod.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Tauri commands: `get_settings`, `save_settings`, `get_favorites`, `toggle_favorite`, `get_recent`, `clear_recent`, `open_logs_folder`.
- Recent history limit: 20.

- [ ] **Step 1: Write failing temporary-directory persistence tests**

Assert DayZ name round-trips; favorite toggle adds then removes; recent list is unique/newest-first and capped at 20.

- [ ] **Step 2: Verify red state**

Run: `cargo test --manifest-path src-tauri/Cargo.toml settings`
Run: `cargo test --manifest-path src-tauri/Cargo.toml collections`
Expected: FAIL before stores exist.

- [ ] **Step 3: Implement JSON stores**

Store files under Tauri local app-data directory. Write through `<name>.tmp` then replace target. Missing files return defaults; corrupt files return a persistence error and are logged.

- [ ] **Step 4: Implement server identity rules**

Use non-empty provider ID first, otherwise `ip:gamePort`. Recent reinsertion moves a server to index 0.

- [ ] **Step 5: Initialize tracing before native work**

Write daily log files under `<local-app-data>/Monarch Lanucher/logs`. Technical causes go to logs; frontend gets concise user-safe errors.

- [ ] **Step 6: Register commands and verify tests**

```bash
cargo test --manifest-path src-tauri/Cargo.toml settings
cargo test --manifest-path src-tauri/Cargo.toml collections
cargo test --manifest-path src-tauri/Cargo.toml logging
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src-tauri
git commit -m "feat: persist settings favorites recent and logs"
```

### Task 5: Add Steam/DayZ discovery and safe direct launch

**Files:**
- Create: `src-tauri/src/steam/mod.rs`
- Create: `src-tauri/src/launcher/mod.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- `SteamPaths { steam_exe, library_roots, dayz_install }`.
- `discover_steam()` reads Windows registry then fallbacks.
- `build_launch_args()` returns separate process arguments.
- `launch_server` records Recent after successful process spawn.

- [ ] **Step 1: Write failing Steam-library parser test**

Feed `libraryfolders.vdf` containing default Steam root plus `D:\SteamLibrary`; assert both unique roots are returned.

- [ ] **Step 2: Write failing launch-argument test**

Assert separate args include `-applaunch`, `221100`, `-connect=1.2.3.4`, `-port=2302`, and `-name=Crash Out`.

- [ ] **Step 3: Verify red states**

Run: `cargo test --manifest-path src-tauri/Cargo.toml steam`
Run: `cargo test --manifest-path src-tauri/Cargo.toml launcher`
Expected: FAIL before implementation.

- [ ] **Step 4: Implement Steam discovery**

On Windows read `HKCU\Software\Valve\Steam` values `SteamExe` and `SteamPath`; fall back to `%ProgramFiles(x86)%\Steam\steam.exe`; parse `steamapps/libraryfolders.vdf` for additional roots.

- [ ] **Step 5: Detect DayZ**

Check every library for `steamapps/common/DayZ/DayZ_x64.exe`; return readable `DayZ is not installed` error when absent.

- [ ] **Step 6: Implement process-safe launch**

Use `std::process::Command` with one `.arg(...)` per argument. Reject NUL/CR/LF in user extra parameters. Launch through Steam app ID 221100, then record Recent only if `spawn()` succeeds.

- [ ] **Step 7: Verify tests/clippy**

```bash
cargo test --manifest-path src-tauri/Cargo.toml steam
cargo test --manifest-path src-tauri/Cargo.toml launcher
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src-tauri
git commit -m "feat: discover Steam and launch DayZ"
```

### Task 6: Build and wire the server-first Next.js UI

**Files:**
- Create: `lib/api.ts`
- Create: `components/app-shell.tsx`
- Create: `components/navigation.tsx`
- Create: `components/server-filters.tsx`
- Create: `components/server-table.tsx`
- Create: `components/status-banner.tsx`
- Create page components for Favorites, Recent, Mods, Settings
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/app-shell.test.tsx`

**Interfaces:**
- `lib/api.ts` is the only frontend module that directly calls Tauri `invoke`.
- Presentation components receive data/callback props and remain native-API free.

- [ ] **Step 1: Write failing navigation/UI-state tests**

Assert visible nav contains Servers/Favorites/Recent/Mods/Settings and no Home. Fake API tests must cover loading, real error + Retry, empty filtered results, favorite action, and settings save.

- [ ] **Step 2: Verify red state**

Run: `npm test -- tests/app-shell.test.tsx`
Expected: FAIL because the new shell/components do not exist.

- [ ] **Step 3: Implement typed API wrappers**

Expose `getServers`, `getFavorites`, `toggleFavorite`, `getRecent`, `clearRecent`, `getSettings`, `saveSettings`, `getSystemStatus`, `launchServer`.

- [ ] **Step 4: Implement compact Monarch shell**

Dark charcoal theme, 188–204px sidebar, one compact top-left Monarch brand treatment, rounded 8–12px cards/buttons/inputs, thin neutral borders, no dashboard hero.

- [ ] **Step 5: Implement Servers page**

Load automatically on mount, use pure `filterServers` locally, show search/map/player/ping/hide-empty/hide-full/modded/password/official/1PP filters, star action, JOIN action, result count, loading/error/retry states.

- [ ] **Step 6: Implement Favorites/Recent/Settings and Phase-1 Mods page**

Favorites and Recent use real Rust persistence. Settings edits DayZ name and extra parameters and displays detected Steam/DayZ status. Mods page shows only the message `Workshop management is added in Phase 2`; it contains no fake mod rows.

- [ ] **Step 7: Run frontend verification**

```bash
npm run typecheck
npm test
npm run build:web
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app components lib tests
git commit -m "feat: build Monarch server-first interface"
```

### Task 7: Full Phase 1 verification gate

**Files:**
- Modify only files required by observed verification failures.

- [ ] **Step 1: Run frontend checks**

```bash
npm ci
npm run typecheck
npm test
npm run build:web
```

Expected: all exit 0.

- [ ] **Step 2: Run Rust checks**

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: zero failures.

- [ ] **Step 3: Run Windows Tauri build**

Run: `npm run tauri build -- --no-bundle`
Expected: executable build exits 0.

- [ ] **Step 4: Push `rewrite/nextjs-rust` and inspect Actions**

Expected: `.github/workflows/verify.yml` completes successfully and no GitHub Release is created.

- [ ] **Step 5: Commit verification corrections only when needed**

```bash
git add -A
git commit -m "fix: complete core launcher verification"
```
