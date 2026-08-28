# Server Directory and Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken legacy Steam master-host discovery path with an automatically populated public DayZ server directory and DZSA-style local filtering.

**Architecture:** Add a provider-backed `IServerDirectoryService` that pages through a public DayZ index and maps rows into a richer `DayZServer` model. Keep provider parsing isolated from the view model; the server view model owns local search/filter state and exposes one filtered collection to WPF. The existing direct A2S code remains available only for future selected-server detail refresh and is no longer required for discovery.

**Tech Stack:** .NET 8, WPF/MVVM, `HttpClient`, `System.Text.Json`, xUnit.

**Spec:** `docs/superpowers/specs/2026-08-28-server-directory-installer-design.md`

## Global Constraints

- Production must not fabricate or hard-code sample servers.
- The Servers page must start loading automatically when opened.
- Discovery must not require the player to type an IP or manually query a server.
- Provider failure must leave the app open, keep Refresh available, and show an inline error.
- Search/filter operations run locally against already loaded rows.
- Full Workshop dependency syncing is out of scope for this plan.

---

### Task 1: Enrich the server model for browser filters

**Files:**
- Modify: `src/MonarchLauncher.App/Models/DayZServer.cs`
- Create: `src/MonarchLauncher.App/Models/ServerFilterState.cs`
- Test: `tests/MonarchLauncher.App.Tests/ServerFilterStateTests.cs`

**Interfaces:**
- Consumes: existing `DayZServer` constructor data.
- Produces: `DayZServer` properties `IsModded`, `IsPassworded`, `IsOfficial`, `AllowsThirdPerson`, `Country`, and `ServerFilterState.Matches(DayZServer)`.

- [ ] **Step 1: Write failing filter tests**

```csharp
[Fact]
public void Matches_hides_empty_servers_when_requested()
{
    var server = TestServer(players: 0);
    var filters = new ServerFilterState { HideEmpty = true };
    Assert.False(filters.Matches(server));
}

[Fact]
public void Matches_applies_map_and_modded_filters()
{
    var server = TestServer(map: "chernarusplus", isModded: true);
    var filters = new ServerFilterState { Map = "chernarusplus", Modded = true };
    Assert.True(filters.Matches(server));
}
```

- [ ] **Step 2: Run the new test file and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter ServerFilterStateTests`
Expected: FAIL because `ServerFilterState` and the new `DayZServer` fields do not exist.

- [ ] **Step 3: Add the richer model and minimal matcher**

Use this shape for the new fields and tri-state filters:

```csharp
public sealed class ServerFilterState
{
    public string SearchText { get; set; } = string.Empty;
    public string Map { get; set; } = string.Empty;
    public int? MinPlayers { get; set; }
    public int? MaxPlayers { get; set; }
    public int? MaxPing { get; set; }
    public bool HideEmpty { get; set; }
    public bool HideFull { get; set; }
    public bool FavoritesOnly { get; set; }
    public bool? Modded { get; set; }
    public bool? Passworded { get; set; }
    public bool? Official { get; set; }
    public bool? ThirdPerson { get; set; }

    public bool Matches(DayZServer server) { /* explicit checks only */ }
}
```

Extend `DayZServer` rather than creating a second UI model.

- [ ] **Step 4: Re-run filter tests and the existing server tests**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter "ServerFilterStateTests|ServersViewModelTests"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/MonarchLauncher.App/Models tests/MonarchLauncher.App.Tests/ServerFilterStateTests.cs
git commit -m "feat: add server browser filter model"
```

---

### Task 2: Add a paged public DayZ directory provider

**Files:**
- Create: `src/MonarchLauncher.App/Services/BattleMetricsServerDirectoryService.cs`
- Create: `src/MonarchLauncher.App/Services/BattleMetricsServerMapper.cs`
- Modify: `src/MonarchLauncher.App/Services/IServerDirectoryService.cs`
- Test: `tests/MonarchLauncher.App.Tests/BattleMetricsServerDirectoryServiceTests.cs`
- Test: `tests/MonarchLauncher.App.Tests/BattleMetricsServerMapperTests.cs`

**Interfaces:**
- Consumes: `HttpClient` and BattleMetrics JSON from `https://api.battlemetrics.com/servers?page[size]=100&filter[game]=dayz&filter[status]=online`.
- Produces: `Task<IReadOnlyList<DayZServer>> GetServersAsync(CancellationToken)` returning every successfully paged server row.

- [ ] **Step 1: Write a failing mapper test with captured JSON**

Use a minimal JSON:API payload containing `name`, `players`, `maxPlayers`, `status`, `ip`, `port`, and `details.map`; assert the mapper returns the expected `DayZServer` fields and defaults unavailable booleans conservatively.

- [ ] **Step 2: Run mapper test and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter BattleMetricsServerMapperTests`
Expected: FAIL because `BattleMetricsServerMapper` does not exist.

- [ ] **Step 3: Implement the mapper using `JsonElement` helpers**

Required behavior:
- missing map => `"DayZ"`
- missing ping => `0`
- online status is preserved
- `details` flags are read only when present
- malformed rows are skipped rather than throwing the whole page

- [ ] **Step 4: Write a failing pagination test with a fake HTTP handler**

The fake handler returns page 1 with a `links.next`, then page 2 without `links.next`. Assert both rows are returned and both URLs are requested exactly once.

- [ ] **Step 5: Run pagination test and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter BattleMetricsServerDirectoryServiceTests`
Expected: FAIL because the directory service does not exist.

- [ ] **Step 6: Implement pagination and partial-page failure behavior**

Implementation rules:
- start with the DayZ online URL above
- follow only provider-supplied absolute `links.next`
- cap at 100 pages per refresh to prevent loops
- de-duplicate by `DayZServer.Id`
- if page 1 fails, throw `ServerDirectoryException`
- if a later page fails, return rows already loaded and surface a partial-load message through a result object

Introduce:

```csharp
public sealed record ServerDirectoryResult(
    IReadOnlyList<DayZServer> Servers,
    bool IsPartial,
    string? Warning);
```

and change `IServerDirectoryService` to:

```csharp
Task<ServerDirectoryResult> GetServersAsync(CancellationToken cancellationToken = default);
```

- [ ] **Step 7: Run provider tests**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter "BattleMetricsServerDirectoryServiceTests|BattleMetricsServerMapperTests"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/MonarchLauncher.App/Services tests/MonarchLauncher.App.Tests/BattleMetricsServer*.cs
git commit -m "feat: load public DayZ server directory"
```

---

### Task 3: Wire automatic loading and local filters into the server view model

**Files:**
- Modify: `src/MonarchLauncher.App/ViewModels/ServersViewModel.cs`
- Modify: `tests/MonarchLauncher.App.Tests/ServersViewModelTests.cs`

**Interfaces:**
- Consumes: `ServerDirectoryResult`, `ServerFilterState`.
- Produces: filter-bound properties (`SelectedMap`, `MinPlayers`, `MaxPlayers`, `MaxPing`, `HideEmpty`, `HideFull`, `ModdedFilter`, `PasswordFilter`, `OfficialFilter`, `PerspectiveFilter`) and `FilteredServers`.

- [ ] **Step 1: Add failing tests for automatic result application and filtering**

Test that a partial result keeps rows visible and sets `StatusText` to the provider warning. Test that setting `HideEmpty = true` immediately removes a zero-player row from `FilteredServers` without calling the directory service again.

- [ ] **Step 2: Run the view-model tests and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter ServersViewModelTests`
Expected: FAIL on the new filter properties/result handling.

- [ ] **Step 3: Implement filter properties and a single `RefreshFilteredServers()` path**

Avoid network access from property setters. Property setters only update `ServerFilterState` and raise `FilteredServers`, `ResultCountText`, and `AvailableMaps` notifications.

- [ ] **Step 4: Re-run view-model tests**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter ServersViewModelTests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/MonarchLauncher.App/ViewModels/ServersViewModel.cs tests/MonarchLauncher.App.Tests/ServersViewModelTests.cs
git commit -m "feat: add DZSA style server filtering"
```

---

### Task 4: Switch startup composition to the HTTP directory provider

**Files:**
- Modify: `src/MonarchLauncher.App/App.xaml.cs`
- Modify: `tests/MonarchLauncher.App.Tests/MainWindowViewModelTests.cs`

**Interfaces:**
- Consumes: shared app `HttpClient`.
- Produces: `BattleMetricsServerDirectoryService` injected into `MainWindowViewModel`.

- [ ] **Step 1: Add/adjust composition tests so the view model no longer depends on the Steam master provider type**

Keep tests at the interface boundary; no live HTTP calls.

- [ ] **Step 2: Run tests and verify RED where applicable**

Run: `dotnet test .\MonarchLauncher.sln -c Release`
Expected: FAIL until new signatures are wired everywhere.

- [ ] **Step 3: Replace `new SteamMasterServerDirectoryService()` with `new BattleMetricsServerDirectoryService(_httpClient)`**

Keep the old Steam/A2S files in the project for future selected-row querying, but remove them from discovery composition.

- [ ] **Step 4: Run the entire solution tests**

Run: `dotnet test .\MonarchLauncher.sln -c Release`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/MonarchLauncher.App/App.xaml.cs tests/MonarchLauncher.App.Tests
git commit -m "feat: use indexed DayZ directory at startup"
```

---

### Task 5: Build the filter bar in WPF

**Files:**
- Modify: `src/MonarchLauncher.App/Views/Pages/ServersView.xaml`
- Modify: `src/MonarchLauncher.App/Styles/Controls.xaml`

**Interfaces:**
- Consumes: filter-bound properties from `ServersViewModel`.
- Produces: compact search + Filters toggle + expandable filter panel.

- [ ] **Step 1: Add the filter panel controls**

Required controls:
- map ComboBox bound to `AvailableMaps` / `SelectedMap`
- min/max players text or numeric fields
- max ping field
- `Hide empty` and `Hide full` checkboxes
- tri-state selectors for modded, password, official/community, first/third person
- `Clear filters` command/button

Use existing gray/white resources and keep the server table as the dominant surface.

- [ ] **Step 2: Add reusable compact ComboBox/CheckBox styles rather than inline styling each control**

Keep corner radius at `5` for filter controls in this plan; window-level corner work belongs to the UI-polish plan.

- [ ] **Step 3: Build on Windows**

Run: `dotnet build .\src\MonarchLauncher.App\MonarchLauncher.App.csproj -c Release`
Expected: PASS with no XAML compiler errors.

- [ ] **Step 4: Run full tests**

Run: `dotnet test .\MonarchLauncher.sln -c Release`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/MonarchLauncher.App/Views/Pages/ServersView.xaml src/MonarchLauncher.App/Styles/Controls.xaml
git commit -m "feat: add server browser filter controls"
```
