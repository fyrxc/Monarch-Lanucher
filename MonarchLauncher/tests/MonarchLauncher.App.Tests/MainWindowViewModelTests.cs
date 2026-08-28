using MonarchLauncher.App.Models;
using MonarchLauncher.App.Services;
using MonarchLauncher.App.ViewModels;

namespace MonarchLauncher.App.Tests;

public sealed class MainWindowViewModelTests
{
    [Fact]
    public void StartsOnServersInsteadOfDashboardHome()
    {
        var vm = CreateViewModel();

        Assert.Equal("servers", vm.SelectedNavigationItem.Key);
        Assert.IsType<ServersViewModel>(vm.CurrentPage);
        Assert.DoesNotContain(vm.NavigationItems, item => item.Key == "home");
        Assert.DoesNotContain(vm.NavigationItems, item => item.Key == "news");
        Assert.DoesNotContain(vm.NavigationItems, item => item.Key == "downloads");
    }

    [Theory]
    [InlineData("favorites", typeof(FavoritesViewModel))]
    [InlineData("recent", typeof(RecentViewModel))]
    [InlineData("mods", typeof(ModsViewModel))]
    [InlineData("settings", typeof(SettingsViewModel))]
    public void NavigationSwitchesToExpectedPage(string key, Type expectedType)
    {
        var vm = CreateViewModel();
        vm.NavigateCommand.Execute(key);
        Assert.Equal(expectedType, vm.CurrentPage.GetType());
    }

    private static MainWindowViewModel CreateViewModel()
    {
        var serverService = new EmptyServerService();
        var launchService = new FakeLaunchService();
        var updateService = new FakeUpdateService();
        return new MainWindowViewModel(serverService, launchService, updateService);
    }

    private sealed class EmptyServerService : IServerDirectoryService
    {
        public Task<ServerDirectoryResult> GetServersAsync(CancellationToken cancellationToken = default)
            => Task.FromResult(new ServerDirectoryResult(Array.Empty<DayZServer>()));
    }

    private sealed class FakeLaunchService : IDayZLaunchService
    {
        public LaunchResult Launch(DayZServer server) => new(true, "Started");
    }

    private sealed class FakeUpdateService : IUpdateService
    {
        public Task<UpdateCheckResult> CheckAsync(Version currentVersion, CancellationToken cancellationToken = default)
            => Task.FromResult(new UpdateCheckResult(true, false, currentVersion, currentVersion, "Up to date", null));

        public Task<string> DownloadAsync(UpdateCheckResult update, IProgress<double>? progress = null, CancellationToken cancellationToken = default)
            => Task.FromResult(string.Empty);

        public void StartUpdater(string packagePath) { }
    }
}
