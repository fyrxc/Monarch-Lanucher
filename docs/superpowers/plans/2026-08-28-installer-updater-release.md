# Installer, Updater, and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Monarch Lanucher as a normal Windows desktop application with Monarch branding, one user-facing setup EXE, per-user installation under LocalAppData, uninstall/shortcuts, signed Tauri updates, and GitHub Releases.

**Architecture:** Tauri 2 owns Windows bundling and signature verification. NSIS installs the application for the current user. GitHub Actions verifies every branch but only `main` builds signed release artifacts and publishes `latest.json` for the Tauri updater.

**Tech Stack:** Tauri 2, NSIS, Rust, Next.js, `tauri-plugin-updater`, `tauri-plugin-process`, GitHub Actions, GitHub Releases.

**Spec:** `docs/superpowers/specs/2026-08-28-nextjs-rust-rewrite-design.md`

## Global Constraints

- Primary user download is `MonarchLanucher-Setup.exe`.
- Windows is the initial packaging target.
- Installer is current-user and does not require Administrator privileges.
- Installed files live under `%LOCALAPPDATA%\Programs\Monarch Lanucher`.
- Monarch crown artwork is used for app, taskbar, installer, and shortcut icons.
- Tauri updater signatures are mandatory; the private signing key is never committed.
- Feature branches never create GitHub Releases.
- `main` releases only after frontend, Rust, and Tauri verification succeed.

---

## File Structure Locked By This Plan

```text
branding/
  monarch-crown-source.png
public/
  monarch-logo.png
src-tauri/
  icons/
    32x32.png
    128x128.png
    128x128@2x.png
    icon.ico
  windows/
    hooks.nsh
  capabilities/default.json
  src/updates/mod.rs
  tauri.conf.json
  Cargo.toml
scripts/
  resolve-version.mjs
  make-latest-json.mjs
.github/workflows/
  verify.yml
  release.yml
components/pages/settings-page.tsx
lib/api.ts
lib/models.ts
tests/
  release-scripts.test.ts
  update-ui.test.tsx
```

### Task 1: Generate Monarch icon assets and lock the NSIS install location

**Files:**
- Create: `branding/monarch-crown-source.png` from the approved user-supplied Monarch crown artwork
- Create: `src-tauri/icons/32x32.png`
- Create: `src-tauri/icons/128x128.png`
- Create: `src-tauri/icons/128x128@2x.png`
- Create: `src-tauri/icons/icon.ico`
- Create: `src-tauri/windows/hooks.nsh`
- Modify: `src-tauri/tauri.conf.json`
- Create/Modify: `public/monarch-logo.png`

**Interfaces:**
- Produces the icon set consumed by Tauri and NSIS.
- Produces current-user install path `%LOCALAPPDATA%\Programs\Monarch Lanucher`.

- [ ] **Step 1: Materialize the approved crown artwork into the repo working tree**

Copy the approved crown image supplied by the user into:

```text
branding/monarch-crown-source.png
```

Do not redraw or recolor it during this task.

- [ ] **Step 2: Generate the Tauri icon set**

Run:

```bash
npm run tauri icon branding/monarch-crown-source.png
```

Verify `src-tauri/icons/icon.ico`, `32x32.png`, `128x128.png`, and `128x128@2x.png` exist.

- [ ] **Step 3: Add the NSIS install-path hook**

`src-tauri/windows/hooks.nsh`:

```nsi
!macro NSIS_HOOK_PREINSTALL
  StrCpy $INSTDIR "$LOCALAPPDATA\Programs\Monarch Lanucher"
!macroend
```

- [ ] **Step 4: Configure Tauri bundling**

Set product name `Monarch Lanucher`, identifier `com.monarch.launcher`, bundle target `nsis`, icon paths above, NSIS `installMode` to `currentUser`, `installerIcon` to `icons/icon.ico`, `startMenuFolder` to `Monarch Lanucher`, and `installerHooks` to `./windows/hooks.nsh`.

- [ ] **Step 5: Run a Windows bundle build**

Run: `npm run tauri build`
Expected: NSIS build completes and produces a setup EXE.

- [ ] **Step 6: Commit**

```bash
git add branding public src-tauri/icons src-tauri/windows src-tauri/tauri.conf.json
git commit -m "feat: add Monarch Windows installer branding"
```

### Task 2: Generate updater signing keys before wiring the updater

**Files:**
- Modify: `src-tauri/tauri.conf.json` with the generated public key only
- Private key location outside repository: `%USERPROFILE%\.tauri\monarch-lanucher.key`

**Interfaces:**
- Produces Tauri public key embedded in app config.
- Produces GitHub Actions secret names `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

- [ ] **Step 1: Generate the updater keypair on the trusted Windows development machine**

PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.tauri" | Out-Null
npm run tauri signer generate -- -w "$env:USERPROFILE\.tauri\monarch-lanucher.key"
```

Use a non-empty password when prompted. Tauri writes the private key to `monarch-lanucher.key` and the public key to `monarch-lanucher.key.pub`.

- [ ] **Step 2: Copy the exact public-key text into Tauri config**

Read:

```powershell
Get-Content "$env:USERPROFILE\.tauri\monarch-lanucher.key.pub" -Raw
```

Write that exact value into `plugins.updater.pubkey` in `src-tauri/tauri.conf.json`. Do not commit the private key.

- [ ] **Step 3: Configure GitHub Actions secrets**

Create repository Actions secrets with exact names:

```text
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

`TAURI_SIGNING_PRIVATE_KEY` contains the complete private-key text. `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` contains the password used in Step 1.

- [ ] **Step 4: Verify private material is not tracked**

Run:

```bash
git status --short
git grep -n "monarch-lanucher.key" -- ':!docs/**'
```

Expected: no private key file or private key content is tracked.

- [ ] **Step 5: Commit the public-key config**

```bash
git add src-tauri/tauri.conf.json
git commit -m "chore: configure Monarch updater public key"
```

### Task 3: Add the signed Tauri updater backend

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/updates/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `src-tauri/tauri.conf.json`

**Interfaces:**
- Produces `UpdateInfo { available, current_version, latest_version, notes }`.
- Produces Tauri commands `check_for_update` and `install_update`.

- [ ] **Step 1: Add updater and process plugins**

Add Tauri 2 `tauri-plugin-updater` and `tauri-plugin-process` dependencies and initialize both plugins from `src-tauri/src/lib.rs`.

- [ ] **Step 2: Write failing tests around an update backend abstraction**

```rust
#[async_trait::async_trait]
pub trait UpdateBackend: Send + Sync {
    async fn check(&self) -> Result<Option<UpdateCandidate>, LauncherError>;
    async fn install(&self, candidate: UpdateCandidate) -> Result<(), LauncherError>;
}
```

Test that `None` returns `available=false`; test that candidate `0.4.8` against current `0.4.7` returns `available=true` and preserves release notes.

- [ ] **Step 3: Verify the red state**

Run: `cargo test --manifest-path src-tauri/Cargo.toml updates`
Expected: FAIL because update module/logic is not implemented.

- [ ] **Step 4: Implement Tauri updater calls**

Use `tauri_plugin_updater::UpdaterExt` to check and install. Return user-safe errors through `LauncherError`; log technical source errors through tracing.

- [ ] **Step 5: Configure signed updater artifacts and endpoint**

Set `bundle.createUpdaterArtifacts` to `true`. Configure updater endpoint exactly:

```text
https://github.com/fyrxc/Monarch-Lanucher/releases/latest/download/latest.json
```

Set Windows updater install mode to `passive`.

- [ ] **Step 6: Register commands and minimum required capabilities**

Expose `check_for_update` and `install_update`; grant only the updater/process permissions needed by this flow.

- [ ] **Step 7: Verify Rust checks**

```bash
cargo test --manifest-path src-tauri/Cargo.toml updates
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src-tauri
git commit -m "feat: add signed Tauri updater backend"
```

### Task 4: Add update controls to the Next.js Settings page

**Files:**
- Modify: `lib/models.ts`
- Modify: `lib/api.ts`
- Modify: `components/pages/settings-page.tsx`
- Create: `tests/update-ui.test.tsx`

**Interfaces:**
- `checkForUpdate()` maps to Tauri `check_for_update`.
- `installUpdate()` maps to Tauri `install_update`.

- [ ] **Step 1: Write a failing update UI test**

```tsx
it("shows Install Update when a newer signed version exists", async () => {
  render(<SettingsPage api={fakeApiWithUpdate("0.4.7", "0.4.8")} />);
  await userEvent.click(screen.getByRole("button", { name: /check for updates/i }));
  expect(await screen.findByRole("button", { name: /install update/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify the red state**

Run: `npm test -- tests/update-ui.test.tsx`
Expected: FAIL until the update controls exist.

- [ ] **Step 3: Implement update states**

Use `idle | checking | up-to-date | available | installing | error`. Disable duplicate actions while checking/installing. Show current and latest versions and returned notes.

- [ ] **Step 4: Keep downloading/installing in Rust**

The frontend only invokes `install_update`; it never downloads installer bytes itself.

- [ ] **Step 5: Run frontend verification**

```bash
npm run typecheck
npm test
npm run build:web
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib components/pages/settings-page.tsx tests/update-ui.test.tsx
git commit -m "feat: add launcher update controls"
```

### Task 5: Add deterministic release version and `latest.json` generation

**Files:**
- Create: `scripts/resolve-version.mjs`
- Create: `scripts/make-latest-json.mjs`
- Create: `tests/release-scripts.test.ts`
- Modify: `package.json`

**Interfaces:**
- `node scripts/resolve-version.mjs 77` prints `0.4.77`.
- `make-latest-json.mjs` writes `release/latest.json` from environment variables.

- [ ] **Step 1: Implement version resolver**

```js
const run = process.argv[2];
if (!/^\d+$/.test(run ?? "")) throw new Error("numeric GitHub run number required");
process.stdout.write(`0.4.${run}`);
```

- [ ] **Step 2: Implement metadata generator**

Read `MONARCH_VERSION`, `MONARCH_RELEASE_URL`, `MONARCH_SIGNATURE`, and `MONARCH_NOTES`, validate each is non-empty, then write JSON with:

```js
{
  version: process.env.MONARCH_VERSION,
  notes: process.env.MONARCH_NOTES,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: process.env.MONARCH_SIGNATURE,
      url: process.env.MONARCH_RELEASE_URL
    }
  }
}
```

- [ ] **Step 3: Write tests**

Test invalid run numbers reject, `77` yields `0.4.77`, and generated metadata parses with the exact supplied Windows URL/signature.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/release-scripts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts tests/release-scripts.test.ts package.json
git commit -m "build: add release metadata generation"
```

### Task 6: Create the main-only signed Windows release workflow

**Files:**
- Create: `.github/workflows/release.yml`
- Modify: `.github/workflows/verify.yml`

**Interfaces:**
- Feature branches: verification only.
- `main`: verification, signed NSIS bundle, GitHub Release.
- Release contains `MonarchLanucher-Setup.exe`, `MonarchLanucher-Setup.exe.sig`, and `latest.json`.

- [ ] **Step 1: Configure trigger and permissions**

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write
```

- [ ] **Step 2: Run the full verification gate first**

Use Node 22 + `npm ci`, typecheck, frontend tests, static build, Rust stable, `cargo fmt --check`, clippy with `-D warnings`, Rust tests, then Tauri build.

- [ ] **Step 3: Resolve version**

PowerShell:

```powershell
$version = node .\scripts\resolve-version.mjs $env:GITHUB_RUN_NUMBER
"MONARCH_VERSION=$version" | Out-File $env:GITHUB_ENV -Append
"MONARCH_TAG=v$version" | Out-File $env:GITHUB_ENV -Append
```

Generate a temporary Tauri config override containing that version and pass it to the build so installer/updater metadata use the same version.

- [ ] **Step 4: Sign updater artifacts**

Map repository secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` to same-named environment variables only for the Tauri build step.

- [ ] **Step 5: Rename generated NSIS outputs**

From `src-tauri/target/release/bundle/nsis/`, copy the generated setup EXE to:

```text
release/MonarchLanucher-Setup.exe
```

Copy its generated signature to:

```text
release/MonarchLanucher-Setup.exe.sig
```

- [ ] **Step 6: Generate updater metadata**

Set `MONARCH_RELEASE_URL` to:

```text
https://github.com/fyrxc/Monarch-Lanucher/releases/download/v${MONARCH_VERSION}/MonarchLanucher-Setup.exe
```

Read complete signature text into `MONARCH_SIGNATURE`, set release notes, then run `node scripts/make-latest-json.mjs`.

- [ ] **Step 7: Publish one release**

```powershell
gh release create $env:MONARCH_TAG `
  .\release\MonarchLanucher-Setup.exe `
  .\release\MonarchLanucher-Setup.exe.sig `
  .\release\latest.json `
  --title $env:MONARCH_TAG `
  --generate-notes
```

- [ ] **Step 8: Commit**

```bash
git add .github/workflows
git commit -m "ci: publish signed Monarch Windows releases"
```

### Task 7: Run installer and update verification on Windows

**Files:**
- Modify only files required by observed verification failures.

- [ ] **Step 1: Run complete build verification**

```bash
npm ci
npm run typecheck
npm test
npm run build:web
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

Expected: all commands exit 0 and NSIS setup/signature artifacts exist.

- [ ] **Step 2: Install on a Windows test account**

Verify the installer requires no elevation, files land under `%LOCALAPPDATA%\Programs\Monarch Lanucher`, Start Menu shortcut launches, Monarch icon appears, and Windows Installed Apps exposes uninstall.

- [ ] **Step 3: Verify uninstall**

Uninstall and confirm installed binaries/shortcuts are removed while separate local settings/log data remains intact.

- [ ] **Step 4: Verify a signed update**

Publish a newer signed test build to the configured GitHub endpoint, run Check for Updates in Settings, confirm version/notes match `latest.json`, install using passive mode, and confirm the relaunched app reports the newer version.

- [ ] **Step 5: Verify the production `main` release contents**

Expected exactly these user-facing update/release files:

```text
MonarchLanucher-Setup.exe
MonarchLanucher-Setup.exe.sig
latest.json
```
