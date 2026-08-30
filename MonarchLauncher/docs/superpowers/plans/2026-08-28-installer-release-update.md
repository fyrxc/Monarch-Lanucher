# Installer, Release, and Installed-Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the normal user download one `MonarchLanucher-Setup.exe`, install under LocalAppData Programs, create shortcuts/uninstall support, and keep GitHub Releases compatible with the existing in-app updater.

**Architecture:** Continue publishing the internal runtime ZIP because the current updater replaces files from that payload, but make the installer EXE the primary human-facing asset. Use Inno Setup for a per-user installer with no admin requirement, and extend GitHub Actions to build/test/publish the launcher, updater, ZIP payload, and installer in one fail-fast release job.

**Tech Stack:** GitHub Actions Windows runner, .NET 8 publish, PowerShell, Inno Setup 6, GitHub CLI.

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
- Consume: `src/MonarchLauncher.App/Assets/monarch-app.ico`

**Interfaces:**
- Consumes: `artifacts/MonarchLauncher-win-x64` and Inno preprocessor constant `AppVersion`.
- Produces: `artifacts/MonarchLanucher-Setup.exe`.

- [ ] **Step 1: Write the installer script with exact install behavior**

Use this structure:

```ini
#define MyAppName "Monarch Lanucher"
#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
AppId={{E13D0A2A-AC02-4F44-A2DA-744B1B1DD718}
AppName={#MyAppName}
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\Monarch Lanucher
DefaultGroupName=Monarch Lanucher
PrivilegesRequired=lowest
OutputDir=..\artifacts
OutputBaseFilename=MonarchLanucher-Setup
Compression=lzma2
SolidCompression=yes
SetupIconFile=..\src\MonarchLauncher.App\Assets\monarch-app.ico
UninstallDisplayIcon={app}\MonarchLauncher.App.exe
WizardStyle=modern

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
Source: "..\artifacts\MonarchLauncher-win-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Monarch Lanucher"; Filename: "{app}\MonarchLauncher.App.exe"
Name: "{autodesktop}\Monarch Lanucher"; Filename: "{app}\MonarchLauncher.App.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\MonarchLauncher.App.exe"; Description: "Launch Monarch Lanucher"; Flags: nowait postinstall skipifsilent
```

- [ ] **Step 2: Compile installer locally on Windows with an explicit version**

Run from `MonarchLauncher`:

```powershell
& "$env:ProgramFiles(x86)\Inno Setup 6\ISCC.exe" "/DAppVersion=0.4.0" ".\installer\MonarchLanucher.iss"
```

Expected: exit code 0 and `artifacts\MonarchLanucher-Setup.exe` exists.

- [ ] **Step 3: Install-test in a disposable Windows user session**

Expected: files under `%LOCALAPPDATA%\Programs\Monarch Lanucher`; Start Menu shortcut opens the launcher; selecting the desktop task creates a working shortcut; Windows Apps/Installed apps contains a Monarch Lanucher uninstall entry.

- [ ] **Step 4: Commit**

```bash
git add installer/MonarchLanucher.iss
git commit -m "feat: add per-user Monarch installer"
```

---

### Task 2: Add executable release-layout tests

**Files:**
- Create: `tests/ReleaseLayout.Tests.ps1`

**Interfaces:**
- Consumes: `launcher-settings.json`, installer script, app icon path.
- Produces: a non-zero exit code on release-path drift.

- [ ] **Step 1: Write the PowerShell test exactly**

```powershell
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $root 'src\MonarchLauncher.App\launcher-settings.json'
$installerPath = Join-Path $root 'installer\MonarchLanucher.iss'
$iconPath = Join-Path $root 'src\MonarchLauncher.App\Assets\monarch-app.ico'

$config = Get-Content $configPath -Raw | ConvertFrom-Json
if ($config.updateAssetName -ne 'MonarchLanucher-win-x64.zip') {
    throw "Unexpected updateAssetName: $($config.updateAssetName)"
}
if (-not (Test-Path $installerPath)) { throw 'Installer script missing.' }
if (-not (Test-Path $iconPath)) { throw 'Monarch app icon missing.' }

$installer = Get-Content $installerPath -Raw
foreach ($required in @(
    'OutputBaseFilename=MonarchLanucher-Setup',
    'DefaultDirName={localappdata}\Programs\Monarch Lanucher',
    'MonarchLauncher.App.exe'
)) {
    if (-not $installer.Contains($required)) { throw "Installer is missing: $required" }
}

Write-Host 'Release layout checks passed.'
```

- [ ] **Step 2: Run test and verify RED before Task 1/icon work is present on the execution branch**

Run: `pwsh -File .\tests\ReleaseLayout.Tests.ps1`
Expected: FAIL on the first genuinely missing prerequisite, typically installer script or icon.

- [ ] **Step 3: Re-run after Task 1 and the icon task from the UI plan**

Run: `pwsh -File .\tests\ReleaseLayout.Tests.ps1`
Expected: PASS with `Release layout checks passed.`.

- [ ] **Step 4: Commit**

```bash
git add tests/ReleaseLayout.Tests.ps1
git commit -m "test: validate release asset layout"
```

---

### Task 3: Build the installer in GitHub Actions

**Files:**
- Modify: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: existing `MONARCH_VERSION`, launcher publish folder, updater publish folder.
- Produces: `artifacts/MonarchLanucher-win-x64.zip` and `artifacts/MonarchLanucher-Setup.exe`.

- [ ] **Step 1: Add release-layout validation immediately after .NET tests**

```yaml
- name: Validate release layout
  shell: pwsh
  run: pwsh -File .\tests\ReleaseLayout.Tests.ps1
```

- [ ] **Step 2: Install Inno Setup before packaging**

```yaml
- name: Setup Inno Setup
  shell: pwsh
  run: |
    choco install innosetup --no-progress -y
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

- [ ] **Step 3: Keep the existing launcher/updater publish and ZIP package names unchanged**

The runtime ZIP remains `artifacts\MonarchLanucher-win-x64.zip` because `launcher-settings.json` and `GitHubUpdateService` use that exact release asset name.

- [ ] **Step 4: Add installer compilation after ZIP packaging**

```yaml
- name: Build installer
  shell: pwsh
  run: |
    $iscc = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
    if (-not (Test-Path $iscc)) { throw "ISCC.exe not found at $iscc" }
    & $iscc "/DAppVersion=$env:MONARCH_VERSION" ".\installer\MonarchLanucher.iss"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    if (-not (Test-Path ".\artifacts\MonarchLanucher-Setup.exe")) { throw "Installer output missing." }
```

- [ ] **Step 5: Trigger `workflow_dispatch` and inspect the step sequence**

Expected: Restore, Test, Validate release layout, Publish launcher, Publish updater, Package, Setup Inno Setup, and Build installer all complete successfully before release creation starts.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: build Monarch setup executable"
```

---

### Task 4: Publish installer and updater payload together

**Files:**
- Modify: `.github/workflows/release.yml`
- Modify: `README.md`

**Interfaces:**
- Produces release assets `MonarchLanucher-Setup.exe` and `MonarchLanucher-win-x64.zip`.

- [ ] **Step 1: Change the release-create command to upload both assets**

```powershell
gh release create "$env:MONARCH_TAG" `
  ".\artifacts\MonarchLanucher-Setup.exe" `
  ".\artifacts\MonarchLanucher-win-x64.zip" `
  --title "$env:MONARCH_TAG" `
  --generate-notes
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

- [ ] **Step 2: Update README install instructions**

Make the first install instruction: `Download MonarchLanucher-Setup.exe from the latest GitHub Release and run it.` State that the default install path is `%LOCALAPPDATA%\Programs\Monarch Lanucher`. Put `MonarchLanucher-win-x64.zip` under a `Portable / updater payload` note and say normal users do not need it.

- [ ] **Step 3: Trigger one release build**

Expected: latest GitHub Release contains both exact asset names; setup EXE is the user-facing installer and ZIP remains available for in-app updates.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/release.yml README.md
git commit -m "docs: make setup exe the primary release"
```

---

### Task 5: Make updater launch configuration directly testable

**Files:**
- Modify: `src/MonarchLauncher.App/Services/GitHubUpdateService.cs`
- Test: `tests/MonarchLauncher.App.Tests/GitHubUpdateServiceTests.cs`

**Interfaces:**
- Consumes: downloaded package path, application base directory, current process ID.
- Produces: `internal static ProcessStartInfo BuildUpdaterStartInfo(string updaterExe, string packagePath, string targetDirectory, int processId)`.

- [ ] **Step 1: Write a failing regression test**

```csharp
[Fact]
public void BuildUpdaterStartInfo_targets_the_installed_application_directory()
{
    var info = GitHubUpdateService.BuildUpdaterStartInfo(
        @"C:\Temp\MonarchLauncher.Updater.exe",
        @"C:\Temp\MonarchLanucher-win-x64.zip",
        @"C:\Users\Test\AppData\Local\Programs\Monarch Lanucher",
        1234);

    Assert.Equal(@"C:\Temp\MonarchLauncher.Updater.exe", info.FileName);
    Assert.Contains(@"C:\Users\Test\AppData\Local\Programs\Monarch Lanucher", info.ArgumentList);
    Assert.Contains("1234", info.ArgumentList);
    Assert.Contains(@"C:\Users\Test\AppData\Local\Programs\Monarch Lanucher\MonarchLauncher.App.exe", info.ArgumentList);
}
```

- [ ] **Step 2: Run and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter BuildUpdaterStartInfo_targets_the_installed_application_directory`
Expected: FAIL because `BuildUpdaterStartInfo` does not exist.

- [ ] **Step 3: Extract the current process-start construction into the pure helper**

The helper creates `ProcessStartInfo` with `UseShellExecute=true`, `WorkingDirectory=Path.GetDirectoryName(updaterExe)!`, then adds arguments in this order: `--pid`, process ID, `--package`, package path, `--target`, target directory, `--launch`, `Path.Combine(targetDirectory, "MonarchLauncher.App.exe")`. `StartUpdater` continues to copy the updater to temp, computes `targetDirectory = AppContext.BaseDirectory.TrimEnd(...)`, calls the helper, and starts it.

- [ ] **Step 4: Run updater tests**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter GitHubUpdateServiceTests`
Expected: PASS.

- [ ] **Step 5: Manual installed-update test**

Install version N with `MonarchLanucher-Setup.exe`, publish version N+1, press Check for Updates, and verify the launcher closes, files under `%LOCALAPPDATA%\Programs\Monarch Lanucher` update to N+1, launcher reopens showing N+1, Start Menu shortcut still opens it, and the uninstall entry remains registered.

- [ ] **Step 6: Run full verification**

Run: `dotnet test .\MonarchLauncher.sln -c Release`
Expected: PASS.
Run: `pwsh -File .\tests\ReleaseLayout.Tests.ps1`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/MonarchLauncher.App/Services/GitHubUpdateService.cs tests/MonarchLauncher.App.Tests/GitHubUpdateServiceTests.cs
git commit -m "test: verify installed update target"
```
