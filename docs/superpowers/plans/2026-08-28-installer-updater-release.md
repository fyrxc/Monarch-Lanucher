# Installer, Updater, and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Monarch Lanucher as a normal Windows desktop application with Monarch branding, a single NSIS setup EXE, per-user installation, uninstall/shortcuts, signed Tauri update artifacts, GitHub Releases, and in-app update checks/install.

**Architecture:** Tauri 2 handles Windows bundling and updater verification. NSIS is the installer target and installs for the current user without elevation. GitHub Actions is the only release builder; feature branches verify only, while `main` builds signed installer/updater artifacts and publishes `latest.json` for the Tauri updater.

**Tech Stack:** Tauri 2, NSIS, Rust, Next.js, `tauri-plugin-updater`, `tauri-plugin-process`, GitHub Actions, GitHub Releases.

**Spec:** `docs/superpowers/specs/2026-08-28-nextjs-rust-rewrite-design.md`

## Global Constraints

- Primary user download is one file named `MonarchLanucher-Setup.exe`.
- Windows is the only initial packaging target.
- Installer mode is current-user so installation does not require Administrator privileges and lives under `%LOCALAPPDATA%` rather than `C:\Program Files`.
- App icon, taskbar icon, installer icon, and shortcuts use the Monarch crown artwork.
- Updates must be signature-verified by Tauri.
- The private updater signing key is never committed to Git.
- Feature branches must never publish GitHub Releases.
- Releases are built from `main` only after frontend, Rust, and Tauri verification pass.

---

## File Structure Locked By This Plan

```text
public/
  monarch-logo.png
src-tauri/
  icons/
    32x32.png
    128x128.png
    128x128@2x.png
    icon.ico
  capabilities/default.json
  src/updates/mod.rs
  tauri.conf.json
  Cargo.toml
scripts/
  make-latest-json.mjs
  resolve-version.mjs
.github/workflows/
  verify.yml
  release.yml
components/pages/settings-page.tsx
lib/api.ts
lib/models.ts
```

### Task 1: Add final Monarch application icon assets and bundle configuration

**Files:**
- Create: `src-tauri/icons/32x32.png`
- Create: `src-tauri/icons/128x128.png`
- Create: `src-tauri/icons/128x128@2x.png`
- Create: `src-tauri/icons/icon.ico`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `public/monarch-logo.png`

**Interfaces:**
- Produces the icon set consumed by Tauri window/bundle/NSIS configuration.

- [ ] **Step 1: Generate Tauri icon assets from the approved Monarch crown source**

Run from the repository root after placing the source artwork in a temporary local path:

```bash
npm run tauri icon <path-to-approved-monarch-crown.png>
```

Keep only the Windows-required and frontend branding outputs listed above plus any Tauri-required generated assets.

- [ ] **Step 2: Configure bundle icons and product metadata**

Set these values in `src-tauri/tauri.conf.json`:

```json
{
  "productName": "Monarch Lanucher",
  "identifier": "com.monarch.launcher",
  "bundle": {
    "active": true,
    "targets": ["nsis"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": {
        "installMode": "currentUser",
        "installerIcon": "icons/icon.ico",
        "startMenuFolder": "Monarch Lanucher"
      }
    }
  }
}
```

- [ ] **Step 3: Verify the icon config resolves during a Windows bundle build**

Run: `npm run tauri build`
Expected: NSIS bundling proceeds without missing icon/config errors.

- [ ] **Step 4: Commit**

```bash
git add public src-tauri/icons src-tauri/tauri.conf.json
git commit -m "feat: add Monarch Windows app branding"
```

### Task 2: Add Tauri updater plugin and Rust update commands

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/updates/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/capabilities/default.json`

**Interfaces:**
- Produces `check_for_update() -> Result<UpdateInfo, LauncherError>`.
- Produces `install_update() -> Result<(), LauncherError>`.
- Produces frontend-facing `UpdateInfo { available, current_version, latest_version, notes }`.

- [ ] **Step 1: Add updater/process dependencies**

Add Tauri 2 updater and process plugins to `src-tauri/Cargo.toml` and initialize them in `src-tauri/src/lib.rs`.

- [ ] **Step 2: Write failing Rust tests around an updater abstraction**

Define an internal trait so the command logic is testable without network/install side effects:

```rust
#[async_trait::async_trait]
pub trait UpdateBackend: Send + Sync {
    async fn check(&self) -> Result<Option<UpdateCandidate>, LauncherError>;
    async fn install(&self, candidate: UpdateCandidate) -> Result<(), LauncherError>;
}
```

Test `None` => `available=false`, and a newer candidate => `available=true` with exact version/notes.

- [ ] **Step 3: Run targeted tests and verify the red state**

Run: `cargo test --manifest-path src-tauri/Cargo.toml updates`
Expected: FAIL because the update module does not exist.

- [ ] **Step 4: Implement Tauri updater backend**

Use `tauri_plugin_updater::UpdaterExt` to check the configured endpoint and install the returned candidate. Configure Windows updater install mode `passive`.

- [ ] **Step 5: Configure updater endpoint and artifact generation**

`src-tauri/tauri.conf.json` must include:

```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      "pubkey": "<PUBLIC_KEY_CONTENT_INSERTED_DURING_IMPLEMENTATION>",
      "endpoints": [
        "https://github.com/fyrxc/Monarch-Lanucher/releases/latest/download/latest.json"
      ],
      "windows": {
        "installMode": "passive"
      }
    }
  }
}
```

During implementation, replace the public-key marker with the generated Tauri updater public key before committing. The private key remains outside Git.

- [ ] **Step 6: Register commands and updater permissions**

Expose `check_for_update` and `install_update`, and grant only the updater/process permissions required by the frontend flow in `src-tauri/capabilities/default.json`.

- [ ] **Step 7: Run Rust tests and clippy**

```bash
cargo test --manifest-path src-tauri/Cargo.toml updates
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src-tauri
git commit -m "feat: add signed Tauri updater integration"
```

### Task 3: Add in-app update UI to Settings

**Files:**
- Modify: `lib/models.ts`
- Modify: `lib/api.ts`
- Modify: `components/pages/settings-page.tsx`
- Create: `tests/update-ui.test.tsx`

**Interfaces:**
- `lib/api.ts` exports `checkForUpdate()` and `installUpdate()`.
- Settings displays current version, latest version, status, check button, and install button when available.

- [ ] **Step 1: Write failing frontend update-state tests**

```tsx
it("shows Install Update when a newer version exists", async () => {
  render(<SettingsPage api={fakeApiWithUpdate("0.4.2", "0.4.3")} />);
  await userEvent.click(screen.getByRole("button", { name: /check for updates/i }));
  expect(await screen.findByRole("button", { name: /install update/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- tests/update-ui.test.tsx`
Expected: FAIL until update controls are implemented.

- [ ] **Step 3: Implement typed update wrappers and Settings state**

Use states `idle | checking | up-to-date | available | installing | error`. Disable duplicate checks/installs while requests are active.

- [ ] **Step 4: Install and relaunch through the Tauri backend only**

The frontend invokes `install_update`; it does not download installer bytes itself.

- [ ] **Step 5: Run frontend checks**

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

### Task 4: Add deterministic release version and updater metadata scripts

**Files:**
- Create: `scripts/resolve-version.mjs`
- Create: `scripts/make-latest-json.mjs`
- Modify: `package.json`

**Interfaces:**
- `resolve-version.mjs <run-number>` prints `0.4.<run-number>`.
- `make-latest-json.mjs` writes `release/latest.json` from exact environment inputs.

- [ ] **Step 1: Create the version resolver**

```js
const run = process.argv[2];
if (!/^\d+$/.test(run ?? "")) throw new Error("numeric GitHub run number required");
process.stdout.write(`0.4.${run}`);
```

- [ ] **Step 2: Create `latest.json` generator**

Read environment variables `MONARCH_VERSION`, `MONARCH_RELEASE_URL`, `MONARCH_SIGNATURE`, and `MONARCH_NOTES`. Write:

```json
{
  "version": "0.4.123",
  "notes": "Monarch Lanucher update",
  "pub_date": "2026-08-28T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "SIGNATURE_CONTENT",
      "url": "https://github.com/fyrxc/Monarch-Lanucher/releases/download/v0.4.123/MonarchLanucher-Setup.exe"
    }
  }
}
```

Use `new Date().toISOString()` for `pub_date`; JSON-encode values rather than string concatenating them.

- [ ] **Step 3: Add Node tests for scripts**

Test invalid run number exits non-zero and valid `77` resolves to `0.4.77`. Test generated JSON parses and contains `windows-x86_64` with the supplied URL/signature.

- [ ] **Step 4: Run script tests**

Run: `npm test -- tests/release-scripts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts package.json tests/release-scripts.test.ts
git commit -m "build: add release metadata generation"
```

### Task 5: Create the main-only Windows release workflow

**Files:**
- Create: `.github/workflows/release.yml`
- Modify: `.github/workflows/verify.yml`

**Interfaces:**
- Feature branches: verification only.
- `main`: verification + signed NSIS build + GitHub Release.
- Release assets: `MonarchLanucher-Setup.exe`, its `.sig`, and `latest.json`.

- [ ] **Step 1: Configure release trigger and permissions**

Use:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write
```

- [ ] **Step 2: Re-run all verification before packaging**

Workflow must run Node 22 setup, `npm ci`, typecheck, tests, static build, Rust stable setup, fmt check, clippy, Rust tests, then Tauri build.

- [ ] **Step 3: Resolve automatic version**

PowerShell:

```powershell
$version = node .\scripts\resolve-version.mjs $env:GITHUB_RUN_NUMBER
"MONARCH_VERSION=$version" | Out-File $env:GITHUB_ENV -Append
"MONARCH_TAG=v$version" | Out-File $env:GITHUB_ENV -Append
```

Generate a temporary Tauri config override containing `version: $version` and pass it to the Tauri build so package/updater metadata uses the same version.

- [ ] **Step 4: Provide updater signing secrets to Tauri build**

Configure repository Actions secrets with exact names:

```text
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

The workflow maps these secrets to environment variables of the same names only for the Tauri build step.

- [ ] **Step 5: Build NSIS updater artifacts**

Run the Tauri Windows bundle on `windows-latest`. Locate the generated NSIS setup EXE and `.sig` under `src-tauri/target/release/bundle/nsis/`. Copy/rename the installer to:

```text
release/MonarchLanucher-Setup.exe
```

Copy the matching signature to:

```text
release/MonarchLanucher-Setup.exe.sig
```

- [ ] **Step 6: Generate `latest.json`**

Set release URL to:

```text
https://github.com/fyrxc/Monarch-Lanucher/releases/download/v${MONARCH_VERSION}/MonarchLanucher-Setup.exe
```

Read the complete signature text from the generated `.sig`, set the environment variables consumed by `scripts/make-latest-json.mjs`, and generate `release/latest.json`.

- [ ] **Step 7: Publish one GitHub Release**

Use GitHub CLI with `GH_TOKEN: ${{ github.token }}`:

```powershell
gh release create $env:MONARCH_TAG `
  .\release\MonarchLanucher-Setup.exe `
  .\release\MonarchLanucher-Setup.exe.sig `
  .\release\latest.json `
  --title $env:MONARCH_TAG `
  --generate-notes
```

Do not create releases from non-main branches.

- [ ] **Step 8: Commit**

```bash
git add .github/workflows
git commit -m "ci: publish signed Monarch Windows releases"
```

### Task 6: Generate updater signing key and configure repository secrets

**Files:**
- Modify: `src-tauri/tauri.conf.json` with public key only.
- No private key file is committed.

**Interfaces:**
- Produces public updater key in app config and private signing material in GitHub Actions secrets.

- [ ] **Step 1: Generate a Tauri updater signing keypair on a trusted machine**

Run the Tauri signer generation command from the project using Tauri CLI 2. Save the private key outside the repository.

- [ ] **Step 2: Put the public key content into `plugins.updater.pubkey`**

Commit only the public key.

- [ ] **Step 3: Add the private key and password to GitHub Actions secrets**

Exact secret names:

```text
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

- [ ] **Step 4: Verify no private key material is tracked**

Run:

```bash
git status --short
git grep -n "TAURI_SIGNING_PRIVATE_KEY" -- ':!docs/**' ':!.github/workflows/**'
```

Expected: only environment/secret-name references; no private key contents.

- [ ] **Step 5: Commit public-key config**

```bash
git add src-tauri/tauri.conf.json
git commit -m "chore: configure Monarch updater public key"
```

### Task 7: Verify installer behavior and release flow

**Files:**
- Modify only files required by observed verification failures.

- [ ] **Step 1: Run the complete local verification suite**

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

Expected: all commands exit 0 and an NSIS setup executable plus signature are produced.

- [ ] **Step 2: Install the generated setup EXE on a Windows test account**

Verify:
- installer runs without Administrator elevation in current-user mode;
- application appears under `%LOCALAPPDATA%`;
- Start Menu shortcut launches the app;
- Monarch icon appears on app/taskbar/shortcut;
- Windows Apps/Installed Apps contains an uninstall entry;
- uninstall removes the installed application without deleting the separate local settings/log data unless explicitly configured to do so.

- [ ] **Step 3: Verify update metadata against a test release**

Host a signed newer build in a GitHub prerelease or temporary test repository/release endpoint, point a test build at its `latest.json`, then confirm `check_for_update` reports the newer version and signature verification accepts the artifact.

- [ ] **Step 4: Verify `main` release workflow**

After merge approval, run the main release workflow and verify one GitHub Release contains exactly:

```text
MonarchLanucher-Setup.exe
MonarchLanucher-Setup.exe.sig
latest.json
```

- [ ] **Step 5: Verify installed app detects that release**

Open Settings, run Check for Updates, confirm the version shown matches `latest.json`, start the update, allow Tauri passive install, and confirm the relaunched app reports the new version.
