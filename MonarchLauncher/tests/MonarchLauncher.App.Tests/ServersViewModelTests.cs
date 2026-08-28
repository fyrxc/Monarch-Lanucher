using MonarchLauncher.App.Models;
using MonarchLauncher.App.Services;
using MonarchLauncher.App.ViewModels;

namespace MonarchLauncher.App.Tests;

public sealed class ServersViewModelTests
{
    [Fact]
    public async Task RefreshLoadsServersFromDirectoryService()
    {
        var service = new FakeServerDirectoryService(
            new DayZServer("1", "The Lab US1", "chernarusplus", 87, 100, 44, "168.100.163.22", 2302, 27016, "online"),
            new DayZServer("2", "Vanilla NY", "chernarusplus", 31, 60, 28, "198.51.100.25", 2302, 27016, "online"));
        var vm = new ServersViewModel(service, new FakeDayZLaunchService());

        await vm.RefreshAsync();

        Assert.Equal(2, vm.Servers.Count);
        Assert.Equal("2 servers", vm.ResultCountText);
        Assert.False(vm.IsLoading);
        Assert.Contains("Updated", vm.StatusText, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SearchFiltersLiveRowsByServerName()
    {
        var service = new FakeServerDirectoryService(
            new DayZServer("1", "The Lab US1", "chernarusplus", 87, 100, 44, "168.100.163.22", 2302, 27016, "online"),
            new DayZServer("2", "Vanilla NY", "chernarusplus", 31, 60, 28, "198.51.100.25", 2302, 27016, "online"));
        var vm = new ServersViewModel(service, new FakeDayZLaunchService());
        await vm.RefreshAsync();

        vm.SearchText = "Lab";

        var result = Assert.Single(vm.FilteredServers);
        Assert.Equal("The Lab US1", result.Name);
        Assert.Equal("1 server", vm.ResultCountText);
    }

    [Fact]
    public async Task HideEmptyFiltersLocallyWithoutAnotherDirectoryRequest()
    {
        var service = new FakeServerDirectoryService(
            new DayZServer("1", "Empty", "enoch", 0, 60, 0, "1.1.1.1", 2302, 2303, "online"),
            new DayZServer("2", "Busy", "enoch", 22, 60, 0, "2.2.2.2", 2302, 2303, "online"));
        var vm = new ServersViewModel(service, new FakeDayZLaunchService());
        await vm.RefreshAsync();

        vm.HideEmpty = true;

        var row = Assert.Single(vm.FilteredServers);
        Assert.Equal("Busy", row.Name);
        Assert.Equal(1, service.CallCount);
    }

    [Fact]
    public async Task PartialResultKeepsRowsAndShowsWarning()
    {
        var service = new FakeServerDirectoryService(
            new ServerDirectoryResult(
                new[] { new DayZServer("1", "Loaded", "sakhal", 10, 60, 0, "3.3.3.3", 2302, 2303, "online") },
                true,
                "Some servers could not be loaded."));
        var vm = new ServersViewModel(service, new FakeDayZLaunchService());

        await vm.RefreshAsync();

        Assert.Single(vm.Servers);
        Assert.Equal("Some servers could not be loaded.", vm.StatusText);
    }

    [Fact]
    public async Task FailedRefreshShowsErrorWithoutFakeServers()
    {
        var vm = new ServersViewModel(new ThrowingServerDirectoryService(), new FakeDayZLaunchService());

        await vm.RefreshAsync();

        Assert.Empty(vm.Servers);
        Assert.Contains("Unable to load", vm.StatusText, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class FakeServerDirectoryService : IServerDirectoryService
    {
        private readonly ServerDirectoryResult _result;
        public int CallCount { get; private set; }

        public FakeServerDirectoryService(params DayZServer[] servers)
            : this(new ServerDirectoryResult(servers))
        {
        }

        public FakeServerDirectoryService(ServerDirectoryResult result)
        {
            _result = result;
        }

        public Task<ServerDirectoryResult> GetServersAsync(CancellationToken cancellationToken = default)
        {
            CallCount++;
            return Task.FromResult(_result);
        }
    }

    private sealed class ThrowingServerDirectoryService : IServerDirectoryService
    {
        public Task<ServerDirectoryResult> GetServersAsync(CancellationToken cancellationToken = default)
            => throw new InvalidOperationException("offline");
    }

    private sealed class FakeDayZLaunchService : IDayZLaunchService
    {
        public LaunchResult Launch(DayZServer server) => new(true, "Started");
    }
}
