# Installer, Release, and Installed-Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the normal user download one `MonarchLanucher-Setup.exe`, install under LocalAppData Programs, create shortcuts/uninstall support, and keep GitHub Releases compatible with the existing in-app updater.

**Architecture:** Continue publishing the internal runtime ZIP because the current updater replaces files from that payload, but make the installer EXE the primary human-facing asset. Use Inno Setup for a per-user installer with no admin requirement, and extend GitHub Actions to build/test/publish the launcher, updater, ZIP payload, and installer in one fail-fast release job.

**Tech Stack:** GitHub Actions Windows runner, .NET 8 publish, PowerShell, Inno Setup, GitHub CLI.

**Spec:** `docs/superpowers/specs/2026-08-28-server-directory-installer-design.md`

## Global Constraints

- Normal users download one setup EXE rather than a loose runtime folder.
- Install path is `%LOCALAPPDATA%\Programs\Monarch Lanucher\`.
- Installer does not require administrator rights.
- Installer creates a Start Menu shortcut and offers an optional desktop shortcut.
- An uninstaller is registered.
- In-app updates continue targeting the installed directory and use the runtime ZIP asset.
- GitHub release creation must not run if tests, publish, packaging, or installer generation fail.

---

### Task 1: Add the Inno Setup project

**Files:**
- Create: `installer/MonarchLanucher.iss`
- Consume existing: `src/MonarchLauncher.App/Assets/monarch-app.ico`

**Interfaces:**
- Consumes: published runtime folder `artifacts/MonarchLauncher-win-x64` and environment/preprocessor version value.
- Produces: `artifacts/MonarchLanucher-Setup.exe`.

- [ ] **Step 1: Write the installer script**

Required Inno Setup directives:

```text
AppName=Monarch Lanucher
DefaultDirName={localappdata}\Programs\Monarch Lanucher
PrivilegesRequired=lowest
OutputBaseFilename=MonarchLanucher-Setup
UninstallDisplayIcon={app}\MonarchLauncher.App.exe
SetupIconFile=..\src\MonarchLauncher.App\Assets\monarch-app.ico
```

Use `{#AppVersion}` as `AppVersion`, copy every file from `..\artifacts\MonarchLauncher-win-x64\*`, create a Start Menu shortcut to `MonarchLauncher.App.exe`, add a `desktopicon` task that is unchecked by default, and add a post-install `run` entry that can launch the app.

- [ ] **Step 2: Compile installer locally on Windows with an explicit version**

Run from `MonarchLauncher`:

```powershell
& "$env:ProgramFiles(x86)\Inno Setup 6\ISCC.exe" "/DAppVersion=0.4.0" ".\installer\MonarchLanucher.iss"
```

Expected: exit code 0 and `artifacts\MonarchLanucher-Setup.exe` exists.

- [ ] **Step 3: Install-test in a disposable Windows user session**

Expected installed files under `%LOCALAPPDATA%\Programs\Monarch Lanucher`, Start Menu shortcut opens the launcher, optional desktop shortcut works, and Apps & Features contains an uninstall entry.

- [ ] **Step 4: Commit**

```bash
git add installer/MonarchLanucher.iss
git commit -m "feat: add per-user Monarch installer"
```

---

### Task 2: Add workflow checks for installer assumptions

**Files:**
- Create: `tests/ReleaseLayout.Tests.ps1`
- Modify: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: repository paths and published output names.
- Produces: a PowerShell test that fails if setup/runtime/updater asset names drift from launcher configuration.

- [ ] **Step 1: Write the failing PowerShell release-layout test**

The script must assert:
- `src/MonarchLauncher.App/launcher-settings.json` has `updateAssetName` equal to `MonarchLanucher-win-x64.zip`
- installer script contains `OutputBaseFilename=MonarchLanucher-Setup`
- installer target EXE is `MonarchLauncher.App.exe`
- expected icon path exists

Exit non-zero on any mismatch.

- [ ] **Step 2: Run before workflow changes and verify expected failure if installer output path is not yet connected**

Run: `pwsh -File .\tests\ReleaseLayout.Tests.ps1`
Expected: FAIL until all declared assets/paths exist.

- [ ] **Step 3: Update repository layout until the script passes**

Do not weaken assertions to make the test green.

- [ ] **Step 4: Commit**

```bash
git add tests/ReleaseLayout.Tests.ps1
git commit -m "test: validate release asset layout"
```

---

### Task 3: Build installer in GitHub Actions

**Files:**
- Modify: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: existing `MONARCH_VERSION`, runtime publish output, updater publish output.
- Produces: setup EXE and runtime ZIP in `MonarchLauncher/artifacts`.

- [ ] **Step 1: Add a release-layout validation step immediately after .NET tests**

```yaml
- name: Validate release layout
  shell: pwsh
  run: pwsh -File .\tests\ReleaseLayout.Tests.ps1
```

- [ ] **Step 2: Install Inno Setup on the Windows runner after validation**

Use:

```yaml
- name: Setup Inno Setup
  shell: pwsh
  run: choco install innosetup --no-progress -y
```

Fail if Chocolatey/installation returns non-zero.

- [ ] **Step 3: Keep existing launcher/updater publish and runtime ZIP packaging**

The runtime ZIP remains exactly:

```text
artifacts\MonarchLanucher-win-x64.zip
```

because the in-app updater reads that asset name.

- [ ] **Step 4: Add installer compile step after runtime packaging**

```yaml
- name: Build installer
  shell: pwsh
  run: |
    $iscc = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
    & $iscc "/DAppVersion=$env:MONARCH_VERSION" ".\installer\MonarchLanucher.iss"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    if (-not (Test-Path ".\artifacts\MonarchLanucher-Setup.exe")) { throw "Installer output missing." }
```

- [ ] **Step 5: Run workflow on a branch/manual dispatch and verify package steps complete**

Expected: Test, Publish launcher, Publish updater, Package, and Build installer all succeed before release creation.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: build Monarch setup executable"
```

---

### Task 4: Publish both assets while making setup the primary download

**Files:**
- Modify: `.github/workflows/release.yml`
- Modify: `README.md`

**Interfaces:**
- Produces release assets `MonarchLanucher-Setup.exe` and `MonarchLanucher-win-x64.zip`.

- [ ] **Step 1: Change the release-create command to upload both assets**

Use:

```powershell
gh release create "$env:MONARCH_TAG" `
  ".\artifacts\MonarchLanucher-Setup.exe" `
  ".\artifacts\MonarchLanucher-win-x64.zip" `
  --title "$env:MONARCH_TAG" `
  --generate-notes
```

Keep the ZIP for updater compatibility; label/document the setup EXE as the normal installation download.

- [ ] **Step 2: Update README install instructions**

The first install section must instruct users to download `MonarchLanucher-Setup.exe`, run it, and launch from Start Menu/Desktop. Put the ZIP under a clearly marked `Portable/debug` note.

- [ ] **Step 3: Trigger one release build**

Expected: GitHub Release contains both assets and the setup EXE is present before considering the task complete.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/release.yml README.md
git commit -m "docs: make setup exe the primary release"
```

---

### Task 5: Verify the updater works from the installed directory

**Files:**
- Modify if needed: `src/MonarchLauncher.App/Services/GitHubUpdateService.cs`
- Modify if needed: `src/MonarchLauncher.Updater/Program.cs`
- Test: `tests/MonarchLauncher.App.Tests/GitHubUpdateServiceTests.cs`

**Interfaces:**
- Consumes: installed `AppContext.BaseDirectory`, runtime ZIP release asset, external temporary updater.
- Produces: in-place replacement and relaunch from `%LOCALAPPDATA%\Programs\Monarch Lanucher`.

- [ ] **Step 1: Add a regression test for target-directory selection**

Assert updater startup uses `AppContext.BaseDirectory` as target and does not derive its target from Downloads, current working directory, or the setup executable path.

- [ ] **Step 2: Run test and verify behavior**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter GitHubUpdateServiceTests`
Expected: PASS if current implementation already uses `AppContext.BaseDirectory`; otherwise FAIL and identify the exact mismatch before editing production code.

- [ ] **Step 3: Make only the minimal production change if the regression test fails**

Preserve the current safe pattern: copy updater EXE to a temp directory, pass `--target` equal to the install directory, close launcher, extract/replace, relaunch `MonarchLauncher.App.exe` from the target directory.

- [ ] **Step 4: Manual installed-update test**

Install version N with `MonarchLanucher-Setup.exe`, publish version N+1, press `Check for Updates`, and verify:
- launcher closes
- files under LocalAppData install directory change to N+1
- launcher reopens
- displayed version is N+1
- Start Menu shortcut still works
- uninstaller remains registered

- [ ] **Step 5: Run full verification**

Run: `dotnet test .\MonarchLauncher.sln -c Release`
Expected: PASS.
Run: `pwsh -File .\tests\ReleaseLayout.Tests.ps1`
Expected: PASS.

- [ ] **Step 6: Commit any required updater fix**

```bash
git add src/MonarchLauncher.App/Services/GitHubUpdateService.cs src/MonarchLauncher.Updater/Program.cs tests/MonarchLauncher.App.Tests/GitHubUpdateServiceTests.cs
git commit -m "fix: update installed launcher in place"
```
