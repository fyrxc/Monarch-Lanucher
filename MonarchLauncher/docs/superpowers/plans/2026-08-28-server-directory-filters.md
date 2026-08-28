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

The test file includes a local `TestServer` helper that constructs the full `DayZServer` record with explicit defaults.

- [ ] **Step 2: Run the new test file and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter ServerFilterStateTests`
Expected: FAIL because `ServerFilterState` and the new `DayZServer` fields do not exist.

- [ ] **Step 3: Add the richer model and matcher**

Extend `DayZServer` with five fields after `Status`: `bool IsModded`, `bool IsPassworded`, `bool IsOfficial`, `bool AllowsThirdPerson`, `string Country`.

Create `ServerFilterState` with this exact matcher:

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

    public bool Matches(DayZServer server)
    {
        if (!string.IsNullOrWhiteSpace(SearchText))
        {
            var q = SearchText.Trim();
            if (!server.Name.Contains(q, StringComparison.OrdinalIgnoreCase) &&
                !server.Map.Contains(q, StringComparison.OrdinalIgnoreCase) &&
                !server.Address.Contains(q, StringComparison.OrdinalIgnoreCase))
                return false;
        }

        if (!string.IsNullOrWhiteSpace(Map) &&
            !string.Equals(server.Map, Map, StringComparison.OrdinalIgnoreCase))
            return false;
        if (MinPlayers is int min && server.Players < min) return false;
        if (MaxPlayers is int max && server.Players > max) return false;
        if (MaxPing is int ping && server.Ping > 0 && server.Ping > ping) return false;
        if (HideEmpty && server.Players == 0) return false;
        if (HideFull && server.Capacity > 0 && server.Players >= server.Capacity) return false;
        if (Modded is bool modded && server.IsModded != modded) return false;
        if (Passworded is bool passworded && server.IsPassworded != passworded) return false;
        if (Official is bool official && server.IsOfficial != official) return false;
        if (ThirdPerson is bool thirdPerson && server.AllowsThirdPerson != thirdPerson) return false;
        return true;
    }
}
```

`FavoritesOnly` remains present for the later favorites-store subsystem; it does not exclude rows until favorite persistence is wired.

- [ ] **Step 4: Re-run filter tests and existing server tests**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter "ServerFilterStateTests|ServersViewModelTests"`
Expected: PASS after updating existing `DayZServer` test constructors with the new fields.

- [ ] **Step 5: Commit**

```bash
git add src/MonarchLauncher.App/Models tests/MonarchLauncher.App.Tests
git commit -m "feat: add server browser filter model"
```

---

### Task 2: Add a paged public DayZ directory provider

**Files:**
- Create: `src/MonarchLauncher.App/Models/ServerDirectoryResult.cs`
- Create: `src/MonarchLauncher.App/Services/ServerDirectoryException.cs`
- Create: `src/MonarchLauncher.App/Services/BattleMetricsServerDirectoryService.cs`
- Create: `src/MonarchLauncher.App/Services/BattleMetricsServerMapper.cs`
- Modify: `src/MonarchLauncher.App/Services/IServerDirectoryService.cs`
- Test: `tests/MonarchLauncher.App.Tests/BattleMetricsServerDirectoryServiceTests.cs`
- Test: `tests/MonarchLauncher.App.Tests/BattleMetricsServerMapperTests.cs`

**Interfaces:**
- Consumes: `HttpClient` and JSON:API responses from `https://api.battlemetrics.com/servers?page[size]=100&filter[game]=dayz&filter[status]=online`.
- Produces: `Task<ServerDirectoryResult> GetServersAsync(CancellationToken cancellationToken = default)`.

- [ ] **Step 1: Write a failing mapper test using an explicit JSON payload**

```csharp
const string json = """
{
  "data": [{
    "type": "server",
    "id": "123",
    "attributes": {
      "name": "Monarch Test",
      "players": 42,
      "maxPlayers": 100,
      "status": "online",
      "ip": "1.2.3.4",
      "port": 2302,
      "details": {
        "map": "chernarusplus",
        "modded": true,
        "password": false,
        "official": false,
        "thirdPerson": true,
        "country": "US"
      }
    }
  }]
}
""";

using var doc = JsonDocument.Parse(json);
var mapped = BattleMetricsServerMapper.MapPage(doc.RootElement);
var server = Assert.Single(mapped);
Assert.Equal("Monarch Test", server.Name);
Assert.Equal("chernarusplus", server.Map);
Assert.Equal(42, server.Players);
Assert.True(server.IsModded);
Assert.True(server.AllowsThirdPerson);
```

- [ ] **Step 2: Run mapper test and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter BattleMetricsServerMapperTests`
Expected: FAIL because `BattleMetricsServerMapper` does not exist.

- [ ] **Step 3: Implement mapper behavior**

`BattleMetricsServerMapper.MapPage(JsonElement root)` returns `IReadOnlyList<DayZServer>` and follows these rules: missing map => `"DayZ"`; missing ping => `0`; missing boolean detail => `false`; missing country => empty string; malformed individual rows are skipped; page-level invalid JSON throws.

- [ ] **Step 4: Write a failing pagination test with a fake HTTP handler**

The fake handler returns page 1 containing one server and `"links":{"next":"https://example.test/page2"}`, then page 2 containing one server and `"links":{}`. Assert `GetServersAsync()` returns two rows and the handler recorded exactly two requests in order.

- [ ] **Step 5: Run pagination test and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter BattleMetricsServerDirectoryServiceTests`
Expected: FAIL because the directory service/result type do not exist.

- [ ] **Step 6: Implement pagination and partial-page failure behavior**

Create:

```csharp
public sealed record ServerDirectoryResult(
    IReadOnlyList<DayZServer> Servers,
    bool IsPartial,
    string? Warning);
```

Change `IServerDirectoryService` to:

```csharp
Task<ServerDirectoryResult> GetServersAsync(CancellationToken cancellationToken = default);
```

Implementation rules: start with the DayZ online URL; follow only absolute HTTPS `links.next`; cap at 100 pages; de-duplicate by `DayZServer.Id`; a first-page failure throws `ServerDirectoryException("Server directory is unavailable.", inner)`; a later-page failure returns prior rows with `IsPartial=true` and warning `"Some server pages could not be loaded."`.

- [ ] **Step 7: Run provider tests**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter "BattleMetricsServerDirectoryServiceTests|BattleMetricsServerMapperTests"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/MonarchLauncher.App/Models/ServerDirectoryResult.cs src/MonarchLauncher.App/Services tests/MonarchLauncher.App.Tests/BattleMetricsServer*.cs
git commit -m "feat: load public DayZ server directory"
```

---

### Task 3: Wire automatic loading and local filters into the server view model

**Files:**
- Modify: `src/MonarchLauncher.App/ViewModels/ServersViewModel.cs`
- Modify: `tests/MonarchLauncher.App.Tests/ServersViewModelTests.cs`

**Interfaces:**
- Consumes: `ServerDirectoryResult`, `ServerFilterState`.
- Produces: `SelectedMap`, `MinPlayers`, `MaxPlayers`, `MaxPing`, `HideEmpty`, `HideFull`, `ModdedFilter`, `PasswordFilter`, `OfficialFilter`, `PerspectiveFilter`, `AvailableMaps`, `ClearFiltersCommand`, and `FilteredServers`.

- [ ] **Step 1: Add failing tests for partial results and local filtering**

Add a fake `IServerDirectoryService` that counts calls. Test that a partial result keeps returned rows and copies the warning into `StatusText`. Test that after one refresh, changing `HideEmpty` filters the rows while the fake service call count remains `1`.

- [ ] **Step 2: Run the view-model tests and verify RED**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter ServersViewModelTests`
Expected: FAIL on the new result/filter properties.

- [ ] **Step 3: Implement a single local filter path**

Keep one `ServerFilterState` field. `FilteredServers` returns `Servers.Where(_filters.Matches)`. Each filter property updates `_filters`, raises its own property notification, then raises `FilteredServers` and `ResultCountText`. `AvailableMaps` is `Servers.Select(s => s.Map).Where(non-empty).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(...)` with an initial `"All maps"` option represented by empty `SelectedMap`. `ClearFiltersCommand` restores all defaults without making a network call.

- [ ] **Step 4: Re-run view-model tests**

Run: `dotnet test .\tests\MonarchLauncher.App.Tests\MonarchLauncher.App.Tests.csproj --filter ServersViewModelTests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/MonarchLauncher.App/ViewModels/ServersViewModel.cs tests/MonarchLauncher.App.Tests/ServersViewModelTests.cs
git commit -m "feat: add DZSA style server filtering"
```

---

### Task 4: Switch startup composition to the indexed HTTP provider

**Files:**
- Modify: `src/MonarchLauncher.App/App.xaml.cs`
- Modify: `tests/MonarchLauncher.App.Tests/MainWindowViewModelTests.cs`

**Interfaces:**
- Consumes: shared app `HttpClient`.
- Produces: `BattleMetricsServerDirectoryService` injected into `MainWindowViewModel`.

- [ ] **Step 1: Update test fakes to the new `ServerDirectoryResult` signature**

Replace every test fake implementation returning `IReadOnlyList<DayZServer>` with `Task.FromResult(new ServerDirectoryResult(rows, false, null))`.

- [ ] **Step 2: Run the solution and verify RED**

Run: `dotnet test .\MonarchLauncher.sln -c Release`
Expected: FAIL until production composition and all interface implementations use the new signature.

- [ ] **Step 3: Replace discovery composition**

In `App.OnStartup`, replace `new SteamMasterServerDirectoryService()` with `new BattleMetricsServerDirectoryService(_httpClient)`. Keep Steam/A2S parser files compiled but unused by discovery.

- [ ] **Step 4: Run the entire solution tests**

Run: `dotnet test .\MonarchLauncher.sln -c Release`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/MonarchLauncher.App/App.xaml.cs tests/MonarchLauncher.App.Tests
git commit -m "feat: use indexed DayZ directory at startup"
```

---

### Task 5: Build the DZSA-style filter bar in WPF

**Files:**
- Modify: `src/MonarchLauncher.App/Views/Pages/ServersView.xaml`
- Modify: `src/MonarchLauncher.App/Styles/Controls.xaml`

**Interfaces:**
- Consumes: filter-bound properties from `ServersViewModel`.
- Produces: compact search + Filters toggle + expandable filter panel.

- [ ] **Step 1: Add the filter panel controls**

Use a `ToggleButton` labeled `Filters` that shows/hides a bordered panel. Add: map ComboBox; min/max players TextBoxes; max ping TextBox; `Hide empty` and `Hide full` CheckBoxes; ComboBoxes with `Either/Yes/No` mapped to nullable booleans for modded/password; `Either/Official/Community`; `Either/First person/Third person`; and a `Clear` button bound to `ClearFiltersCommand`.

- [ ] **Step 2: Add reusable compact styles**

Create `Style.CompactComboBox`, `Style.CompactCheckBox`, and `Style.FilterToggleButton` in `Controls.xaml`. Use corner radius `5`, existing brushes, 12 px UI font, and no new color palette.

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
