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
    public async Task FailedRefreshShowsErrorWithoutFakeServers()
    {
        var vm = new ServersViewModel(new ThrowingServerDirectoryService(), new FakeDayZLaunchService());

        await vm.RefreshAsync();

        Assert.Empty(vm.Servers);
        Assert.Contains("Unable to load", vm.StatusText, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class FakeServerDirectoryService : IServerDirectoryService
    {
        private readonly IReadOnlyList<DayZServer> _servers;

        public FakeServerDirectoryService(params DayZServer[] servers)
        {
            _servers = servers;
        }

        public Task<IReadOnlyList<DayZServer>> GetServersAsync(CancellationToken cancellationToken = default)
            => Task.FromResult(_servers);
    }

    private sealed class ThrowingServerDirectoryService : IServerDirectoryService
    {
        public Task<IReadOnlyList<DayZServer>> GetServersAsync(CancellationToken cancellationToken = default)
            => throw new InvalidOperationException("offline");
    }

    private sealed class FakeDayZLaunchService : IDayZLaunchService
    {
        public LaunchResult Launch(DayZServer server) => new(true, "Started");
    }
}
