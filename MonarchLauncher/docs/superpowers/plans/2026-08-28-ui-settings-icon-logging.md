# UI, Player Settings, Icon, and Startup Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the launcher shell, persist a DayZ player name, apply the Monarch crown app icon, and add local startup/error logging.

**Architecture:** Keep the existing MVVM/navigation shell, but consolidate branding and reusable visual resources instead of replacing the application architecture. Split install-time GitHub settings from mutable per-user settings so the DayZ name is stored under `%LOCALAPPDATA%`. Add a small logging service that captures startup exceptions before the WPF window is shown.

**Tech Stack:** .NET 8, WPF, JSON settings, Windows shell icon resources, xUnit.

**Spec:** `docs/superpowers/specs/2026-08-28-server-directory-installer-design.md`

## Global Constraints

- Visual direction remains dark charcoal with gray/white Monarch branding.
- Top-left branding shows one clean Monarch identity, not duplicated logos.
- Main window, panels, search fields, and buttons use consistent rounded corners.
- DayZ name is stored per-user, not in the install directory.
- Startup failures must be written to a local log file instead of silently closing.

---

### Task 1: Split immutable build settings from mutable user settings

**Files:**
- Modify: `src/MonarchLauncher.App/Models/LauncherSettings.cs`
- Create: `src/MonarchLauncher.App/Models/UserSettings.cs`
- Modify: `src/MonarchLauncher.App/Services/LauncherSettingsService.cs`
- Create: `src/MonarchLauncher.App/Services/UserSettingsService.cs`
- Test: `tests/MonarchLauncher.App.Tests/UserSettingsServiceTests.cs`

**Interfaces:**
- Consumes: `%LOCALAPPDATA%` through an injectable base path for tests.
- Produces: `UserSettingsService.Load()` and `UserSettingsService.Save(UserSettings)` plus `UserSettings.DayZName`.

- [ ] **Step 1: Write failing persistence tests**

```csharp
[Fact]
public void Save_then_load_round_trips_dayz_name()
{
    using var temp = new TempDirectory();
    var service = new UserSettingsService(temp.Path);
    service.Save(new UserSettings { DayZName = "MonarchPlayer" });
    Assert.Equal("MonarchPlayer", service.Load().DayZName);
}

[Fact]
public void Load_returns_defaults_when_file_is_invalid()
{
    using var temp = new TempDirectory();
    File.WriteAllText(Path.Combine(temp.Path, "settings.json"), "not json");
    var service = new UserSettingsService(temp.Path);
    Assert.Equal(string.Empty, service.Load().DayZName);
}
```

- [ ] **Step 2: Run tests and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter UserSettingsServiceTests`
Expected: FAIL because the new types do not exist.

- [ ] **Step 3: Implement per-user storage**

Default directory:

```csharp
Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
    "Monarch Lanucher")
```

Default file: `settings.json`. Create the directory on save. Use indented `System.Text.Json` output. Keep GitHub owner/repository/update-asset properties in `LauncherSettings` loaded from the shipped `launcher-settings.json`.

- [ ] **Step 4: Re-run tests**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter UserSettingsServiceTests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/MonarchLauncher.App/Models src/MonarchLauncher.App/Services tests/MonarchLauncher.App.Tests/UserSettingsServiceTests.cs
git commit -m "feat: persist per-user launcher settings"
```

---

### Task 2: Apply the saved DayZ name when launching

**Files:**
- Modify: `src/MonarchLauncher.App/Services/IDayZLaunchService.cs`
- Modify: `src/MonarchLauncher.App/Services/SteamDayZLaunchService.cs`
- Test: `tests/MonarchLauncher.App.Tests/SteamDayZLaunchServiceTests.cs`

**Interfaces:**
- Consumes: `DayZServer` and saved `DayZName`.
- Produces: deterministic launch argument generation including `-name=<quoted name>` when non-empty.

- [ ] **Step 1: Write a failing argument-generation test**

Expose an internal pure helper:

```csharp
internal static string BuildArguments(DayZServer server, string dayZName)
```

Assert a name containing spaces produces:

```text
-applaunch 221100 -connect=1.2.3.4 -port=2302 -name="Monarch Player"
```

- [ ] **Step 2: Run test and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter SteamDayZLaunchServiceTests`
Expected: FAIL because `BuildArguments` and name-aware launch do not exist.

- [ ] **Step 3: Implement name-aware arguments and injection**

Change launch service construction to accept `Func<UserSettings>` or `UserSettingsService`; read the latest saved name at launch time so Settings changes do not require restarting the launcher.

- [ ] **Step 4: Re-run launch tests**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter SteamDayZLaunchServiceTests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/MonarchLauncher.App/Services tests/MonarchLauncher.App.Tests/SteamDayZLaunchServiceTests.cs
git commit -m "feat: apply saved DayZ player name"
```

---

### Task 3: Build the editable DayZ Name settings UI

**Files:**
- Modify: `src/MonarchLauncher.App/ViewModels/SettingsViewModel.cs`
- Modify: `src/MonarchLauncher.App/ViewModels/MainWindowViewModel.cs`
- Modify: `src/MonarchLauncher.App/Views/Pages/SettingsView.xaml`
- Modify: `src/MonarchLauncher.App/App.xaml.cs`
- Test: `tests/MonarchLauncher.App.Tests/SettingsViewModelTests.cs`

**Interfaces:**
- Consumes: `UserSettingsService`.
- Produces: `DayZName`, `SaveCommand`, and `StatusText` bindings.

- [ ] **Step 1: Write failing view-model tests**

Test initial load from persisted settings and test that executing Save writes the new name and sets `StatusText` to `"Saved"`.

- [ ] **Step 2: Run tests and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter SettingsViewModelTests`
Expected: FAIL because settings editing does not exist.

- [ ] **Step 3: Implement view model and composition**

Keep validation minimal: trim whitespace; empty name is allowed and means DayZ/Steam default behavior.

- [ ] **Step 4: Replace the placeholder settings card with one compact editable row**

Layout:
- label `DayZ Name`
- TextBox bound two-way to `DayZName`
- `Save` button
- metadata text explaining it is applied when joining a server
- existing updater information below

- [ ] **Step 5: Run tests and build**

Run: `dotnet test .\MonarchLauncher.sln -c Release`
Expected: PASS.
Run: `dotnet build .\src\MonarchLauncher.App\MonarchLauncher.App.csproj -c Release`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/MonarchLauncher.App/ViewModels src/MonarchLauncher.App/Views/Pages/SettingsView.xaml src/MonarchLauncher.App/App.xaml.cs tests/MonarchLauncher.App.Tests/SettingsViewModelTests.cs
git commit -m "feat: add DayZ name setting"
```

---

### Task 4: Add startup and unhandled-exception logging

**Files:**
- Create: `src/MonarchLauncher.App/Services/LauncherLog.cs`
- Modify: `src/MonarchLauncher.App/App.xaml.cs`
- Test: `tests/MonarchLauncher.App.Tests/LauncherLogTests.cs`

**Interfaces:**
- Produces: `LauncherLog.Write(string message, Exception? exception = null)` and `LauncherLog.LogPath`.

- [ ] **Step 1: Write a failing log-file test using an injectable directory**

Assert one call creates `launcher.log` and contains both the supplied message and exception type.

- [ ] **Step 2: Run and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter LauncherLogTests`
Expected: FAIL because the logger does not exist.

- [ ] **Step 3: Implement append-only local logging**

Default path:

```text
%LOCALAPPDATA%\Monarch Lanucher\Logs\launcher.log
```

Each line starts with an ISO-8601 timestamp. Swallow logging failures so logging can never crash startup.

- [ ] **Step 4: Wire startup guards**

In `App.OnStartup`, wrap composition/window creation in `try/catch`, write the exception, show a short MessageBox containing the log path, then call `Shutdown(1)`. Also subscribe to `DispatcherUnhandledException` and `AppDomain.CurrentDomain.UnhandledException` for diagnostics.

- [ ] **Step 5: Run tests**

Run: `dotnet test .\MonarchLauncher.sln -c Release`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/MonarchLauncher.App/Services/LauncherLog.cs src/MonarchLauncher.App/App.xaml.cs tests/MonarchLauncher.App.Tests/LauncherLogTests.cs
git commit -m "feat: log launcher startup failures"
```

---

### Task 5: Clean the shell and apply consistent rounded visual treatment

**Files:**
- Modify: `src/MonarchLauncher.App/Views/MainWindow.xaml`
- Modify: `src/MonarchLauncher.App/Styles/Controls.xaml`
- Modify: `src/MonarchLauncher.App/Styles/Colors.xaml`
- Modify: `src/MonarchLauncher.App/Views/Pages/ServersView.xaml`

**Interfaces:**
- Consumes: existing navigation/view models.
- Produces: visual-only WPF changes with no behavior changes.

- [ ] **Step 1: Consolidate the top-left brand**

Use the full Monarch wordmark only once in the sidebar header. In the title bar use only the crown/app icon at 16–18 px next to `Monarch Lanucher`; remove the second clipped full wordmark.

- [ ] **Step 2: Add a rounded outer window surface without breaking resize**

Keep `WindowStyle="None"` and `WindowChrome`. Set the actual Window background transparent and place the full UI inside an outer `Border` with `CornerRadius="8"`, dark background, and `ClipToBounds="True"`. When maximized, set corner radius to `0` from code-behind so edges meet the monitor bounds.

- [ ] **Step 3: Normalize component radii and density**

Use:
- outer window: 8 normal / 0 maximized
- primary panels: 6
- search/filter controls: 5
- buttons/navigation items: 5
- server rows: no separate card radius; keep dense table behavior

Reduce sidebar width from 200 to approximately 186 unless text clipping occurs. Reduce vertical dead space around headers.

- [ ] **Step 4: Windows build check**

Run: `dotnet build .\src\MonarchLauncher.App\MonarchLauncher.App.csproj -c Release`
Expected: PASS with no XAML errors.

- [ ] **Step 5: Commit**

```bash
git add src/MonarchLauncher.App/Views src/MonarchLauncher.App/Styles
git commit -m "style: polish Monarch launcher shell"
```

---

### Task 6: Convert and apply the supplied Monarch crown icon

**Files:**
- Create binary asset: `src/MonarchLauncher.App/Assets/monarch-app.ico`
- Modify: `src/MonarchLauncher.App/MonarchLauncher.App.csproj`
- Modify: `src/MonarchLauncher.App/Views/MainWindow.xaml`

**Interfaces:**
- Consumes: user-supplied crown-only PNG from the approved design conversation.
- Produces: one `.ico` containing 16, 24, 32, 48, 64, 128, and 256 pixel images.

- [ ] **Step 1: Generate the multi-size `.ico` from the crown PNG**

Preserve transparency; do not alter the white crown shape beyond proportional padding required for square icon bounds.

- [ ] **Step 2: Wire project and window icon**

Add:

```xml
<ApplicationIcon>Assets\monarch-app.ico</ApplicationIcon>
```

and set `Icon="/Assets/monarch-app.ico"` on `MainWindow` if WPF resource resolution requires it.

- [ ] **Step 3: Publish and inspect output metadata on Windows**

Run: `dotnet publish .\src\MonarchLauncher.App\MonarchLauncher.App.csproj -c Release -r win-x64 --self-contained false -o .\artifacts\icon-check`
Expected: PASS and `MonarchLauncher.App.exe` displays the Monarch crown in Explorer/taskbar.

- [ ] **Step 4: Commit**

```bash
git add src/MonarchLauncher.App/Assets/monarch-app.ico src/MonarchLauncher.App/MonarchLauncher.App.csproj src/MonarchLauncher.App/Views/MainWindow.xaml
git commit -m "feat: add Monarch application icon"
```
