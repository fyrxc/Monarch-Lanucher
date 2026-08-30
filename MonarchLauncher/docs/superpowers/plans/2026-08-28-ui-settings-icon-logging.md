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
- Create: `src/MonarchLauncher.App/Services/UserSettingsService.cs`
- Test: `tests/MonarchLauncher.App.Tests/UserSettingsServiceTests.cs`

**Interfaces:**
- Consumes: `%LOCALAPPDATA%` through an optional constructor directory used by tests.
- Produces: `UserSettingsService.Load()`, `UserSettingsService.Save(UserSettings)`, and `UserSettings.DayZName`.

- [ ] **Step 1: Write failing persistence tests**

Use `Path.Combine(Path.GetTempPath(), "MonarchLanucherTests", Guid.NewGuid().ToString("N"))` in each test and delete the directory in `finally`.

```csharp
[Fact]
public void Save_then_load_round_trips_dayz_name()
{
    var root = Path.Combine(Path.GetTempPath(), "MonarchLanucherTests", Guid.NewGuid().ToString("N"));
    try
    {
        var service = new UserSettingsService(root);
        service.Save(new UserSettings { DayZName = "MonarchPlayer" });
        Assert.Equal("MonarchPlayer", service.Load().DayZName);
    }
    finally
    {
        if (Directory.Exists(root)) Directory.Delete(root, true);
    }
}

[Fact]
public void Load_returns_defaults_when_file_is_invalid()
{
    var root = Path.Combine(Path.GetTempPath(), "MonarchLanucherTests", Guid.NewGuid().ToString("N"));
    try
    {
        Directory.CreateDirectory(root);
        File.WriteAllText(Path.Combine(root, "settings.json"), "not json");
        var service = new UserSettingsService(root);
        Assert.Equal(string.Empty, service.Load().DayZName);
    }
    finally
    {
        if (Directory.Exists(root)) Directory.Delete(root, true);
    }
}
```

- [ ] **Step 2: Run tests and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter UserSettingsServiceTests`
Expected: FAIL because the new types do not exist.

- [ ] **Step 3: Implement per-user storage**

Create:

```csharp
public sealed class UserSettings
{
    public string DayZName { get; set; } = string.Empty;
}
```

`UserSettingsService()` defaults its directory to:

```csharp
Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
    "Monarch Lanucher")
```

`UserSettingsService(string baseDirectory)` is the testable constructor. Store `settings.json`, create the directory on save, use indented `System.Text.Json`, and return defaults on missing/invalid JSON. Keep GitHub owner/repository/update-asset properties in the shipped `LauncherSettings` model.

- [ ] **Step 4: Re-run tests**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter UserSettingsServiceTests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/MonarchLauncher.App/Models src/MonarchLauncher.App/Services/UserSettingsService.cs tests/MonarchLauncher.App.Tests/UserSettingsServiceTests.cs
git commit -m "feat: persist per-user launcher settings"
```

---

### Task 2: Apply the saved DayZ name when launching

**Files:**
- Modify: `src/MonarchLauncher.App/Services/SteamDayZLaunchService.cs`
- Modify: `src/MonarchLauncher.App/App.xaml.cs`
- Test: `tests/MonarchLauncher.App.Tests/SteamDayZLaunchServiceTests.cs`

**Interfaces:**
- Consumes: `DayZServer` and `UserSettingsService`.
- Produces: `internal static string BuildArguments(DayZServer server, string dayZName)` and name-aware `Launch(DayZServer)`.

- [ ] **Step 1: Write a failing argument-generation test**

```csharp
[Fact]
public void BuildArguments_quotes_saved_dayz_name()
{
    var server = TestServer(ip: "1.2.3.4", port: 2302);
    var args = SteamDayZLaunchService.BuildArguments(server, "Monarch Player");
    Assert.Equal("-applaunch 221100 -connect=1.2.3.4 -port=2302 -name=\"Monarch Player\"", args);
}
```

- [ ] **Step 2: Run test and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter SteamDayZLaunchServiceTests`
Expected: FAIL because `BuildArguments` is absent.

- [ ] **Step 3: Implement name-aware launch arguments**

Change `SteamDayZLaunchService` constructor to:

```csharp
public SteamDayZLaunchService(UserSettingsService userSettingsService)
```

`Launch` calls `userSettingsService.Load().DayZName` immediately before building arguments. `BuildArguments` trims the name, escapes embedded `"` as `\"`, omits `-name` when the result is empty, and otherwise appends `-name="..."`.

- [ ] **Step 4: Wire the service in `App.OnStartup`**

Create one `UserSettingsService` instance and pass it to `SteamDayZLaunchService`; the same instance is later passed to `SettingsViewModel` through `MainWindowViewModel`.

- [ ] **Step 5: Re-run launch tests**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter SteamDayZLaunchServiceTests`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/MonarchLauncher.App/Services/SteamDayZLaunchService.cs src/MonarchLauncher.App/App.xaml.cs tests/MonarchLauncher.App.Tests/SteamDayZLaunchServiceTests.cs
git commit -m "feat: apply saved DayZ player name"
```

---

### Task 3: Build the editable DayZ Name settings UI

**Files:**
- Modify: `src/MonarchLauncher.App/ViewModels/SettingsViewModel.cs`
- Modify: `src/MonarchLauncher.App/ViewModels/MainWindowViewModel.cs`
- Modify: `src/MonarchLauncher.App/Views/Pages/SettingsView.xaml`
- Test: `tests/MonarchLauncher.App.Tests/SettingsViewModelTests.cs`

**Interfaces:**
- Consumes: `UserSettingsService`.
- Produces: `DayZName`, `SaveCommand`, and `StatusText` bindings.

- [ ] **Step 1: Write failing view-model tests**

Create a temporary `UserSettingsService` as in Task 1. Pre-save `OldName`, construct `SettingsViewModel`, assert `DayZName == "OldName"`; set `DayZName = "New Name"`, execute `SaveCommand`, then assert the service reloads `New Name` and `StatusText == "Saved"`.

- [ ] **Step 2: Run tests and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter SettingsViewModelTests`
Expected: FAIL because settings editing does not exist.

- [ ] **Step 3: Implement view model and composition**

`SettingsViewModel(UserSettingsService service)` loads the current settings in its constructor. `SaveCommand` writes `new UserSettings { DayZName = DayZName.Trim() }` and updates `StatusText`. Change `MainWindowViewModel` constructor to accept `UserSettingsService` and instantiate `SettingsViewModel(userSettingsService)` in `_pages`.

- [ ] **Step 4: Replace the placeholder settings card with a compact editable row**

Use a two-column grid: label `DayZ Name`; TextBox bound two-way to `DayZName`; Save button aligned right; metadata below reading `Used when Monarch launches DayZ. Leave blank to use the game default.`; `StatusText` beside the Save button. Keep updater information in a second card.

- [ ] **Step 5: Run tests and build**

Run: `dotnet test .\MonarchLauncher.sln -c Release`
Expected: PASS.
Run: `dotnet build .\src\MonarchLauncher.App\MonarchLauncher.App.csproj -c Release`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/MonarchLauncher.App/ViewModels src/MonarchLauncher.App/Views/Pages/SettingsView.xaml tests/MonarchLauncher.App.Tests/SettingsViewModelTests.cs
git commit -m "feat: add DayZ name setting"
```

---

### Task 4: Add startup and unhandled-exception logging

**Files:**
- Create: `src/MonarchLauncher.App/Services/LauncherLog.cs`
- Modify: `src/MonarchLauncher.App/App.xaml.cs`
- Test: `tests/MonarchLauncher.App.Tests/LauncherLogTests.cs`

**Interfaces:**
- Produces: `LauncherLog(string? logDirectory = null)`, `Write(string message, Exception? exception = null)`, and `LogPath`.

- [ ] **Step 1: Write a failing log-file test**

Create a temporary directory, instantiate `new LauncherLog(root)`, call `Write("startup failed", new InvalidOperationException("boom"))`, then assert `File.ReadAllText(log.LogPath)` contains `startup failed`, `InvalidOperationException`, and `boom`.

- [ ] **Step 2: Run and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter LauncherLogTests`
Expected: FAIL because `LauncherLog` does not exist.

- [ ] **Step 3: Implement append-only local logging**

Default directory is `%LOCALAPPDATA%\Monarch Lanucher\Logs`; file is `launcher.log`. Each entry begins with `DateTimeOffset.Now.ToString("O")`. Append exception `ToString()` on the next line. Wrap directory/file operations in `try/catch` and swallow only errors thrown by logging itself.

- [ ] **Step 4: Wire startup guards**

At the top of `App.OnStartup`, create the logger and subscribe to `DispatcherUnhandledException` and `AppDomain.CurrentDomain.UnhandledException`. Wrap service composition/window creation in `try/catch`; on failure write `Launcher startup failed`, show `Monarch Lanucher could not start. Error details were written to: <LogPath>`, then `Shutdown(1)`.

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
- Modify: `src/MonarchLauncher.App/Views/MainWindow.xaml.cs`
- Modify: `src/MonarchLauncher.App/Styles/Controls.xaml`
- Modify: `src/MonarchLauncher.App/Styles/Colors.xaml`
- Modify: `src/MonarchLauncher.App/Views/Pages/ServersView.xaml`

**Interfaces:**
- Consumes: existing navigation/view models.
- Produces: visual-only WPF changes with no navigation behavior changes.

- [ ] **Step 1: Consolidate the top-left brand**

Use the full Monarch wordmark only once in the sidebar header. In the title bar reserve an 18x18 crown icon area next to `Monarch Lanucher`; remove the clipped full wordmark currently occupying the title bar left column.

- [ ] **Step 2: Add a rounded outer window surface without breaking resize**

Keep `WindowStyle="None"` and `WindowChrome`. Set Window `Background="Transparent"` and place the complete existing root grid inside `<Border x:Name="WindowSurface" CornerRadius="8" Background="{DynamicResource Brush.Window}" ClipToBounds="True">`. In `UpdateMaximizeGlyph()`, also set `WindowSurface.CornerRadius = WindowState == WindowState.Maximized ? new CornerRadius(0) : new CornerRadius(8);`.

- [ ] **Step 3: Normalize component radii and density**

Set exact radii: outer window 8 normal/0 maximized; primary cards 6; search/filter controls 5; buttons/navigation items 5. Keep server rows square/continuous as a table. Set both sidebar column definitions from 200 to `186`; reduce sidebar header margin to `12,12,12,8` and Servers page root margin to `16`.

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
- Consumes: the user-supplied crown-only PNG from the approved design conversation.
- Produces: one `.ico` containing 16, 24, 32, 48, 64, 128, and 256 pixel images.

- [ ] **Step 1: Generate the multi-size `.ico` from the crown PNG**

Preserve the transparent background and white crown shape. Center the crown in a square transparent canvas with 8% padding on each side, then encode the listed sizes into one ICO.

- [ ] **Step 2: Wire project and window icon**

Add to the main property group:

```xml
<ApplicationIcon>Assets\monarch-app.ico</ApplicationIcon>
```

Add the icon as a WPF resource:

```xml
<Resource Include="Assets\monarch-app.ico" />
```

Set `Icon="/Assets/monarch-app.ico"` on `MainWindow` and use the same resource in the 18x18 title-bar crown image.

- [ ] **Step 3: Publish and inspect output metadata on Windows**

Run: `dotnet publish .\src\MonarchLauncher.App\MonarchLauncher.App.csproj -c Release -r win-x64 --self-contained false -o .\artifacts\icon-check`
Expected: PASS; Explorer and the running taskbar button display the crown icon.

- [ ] **Step 4: Commit**

```bash
git add src/MonarchLauncher.App/Assets/monarch-app.ico src/MonarchLauncher.App/MonarchLauncher.App.csproj src/MonarchLauncher.App/Views/MainWindow.xaml
git commit -m "feat: add Monarch application icon"
```
