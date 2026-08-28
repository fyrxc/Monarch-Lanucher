using MonarchLauncher.App.Models;
using MonarchLauncher.App.Services;
using MonarchLauncher.App.ViewModels;

namespace MonarchLauncher.App.Tests;

public sealed class ServerCollectionsViewModelTests
{
    [Fact]
    public void ServersPageFavoritesAndRecordsSuccessfulJoins()
    {
        var root = CreateRoot();
        try
        {
            var collections = new ServerCollectionService(root);
            var launch = new FakeLaunchService(true);
            var vm = new ServersViewModel(new EmptyServerService(), launch, collections);
            var server = CreateServer("1", "Monarch Test");

            vm.ToggleFavoriteCommand.Execute(server);
            vm.JoinCommand.Execute(server);

            Assert.Single(collections.GetFavorites());
            Assert.Single(collections.GetRecent());
            Assert.Contains("favorite", vm.StatusText, StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    [Fact]
    public void FailedJoinDoesNotEnterRecentServers()
    {
        var root = CreateRoot();
        try
        {
            var collections = new ServerCollectionService(root);
            var vm = new ServersViewModel(new EmptyServerService(), new FakeLaunchService(false), collections);
            var server = CreateServer("1", "Offline");

            vm.JoinCommand.Execute(server);

            Assert.Empty(collections.GetRecent());
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    [Fact]
    public void FavoritesPageTracksCollectionChangesAndCanRemoveRows()
    {
        var root = CreateRoot();
        try
        {
            var collections = new ServerCollectionService(root);
            var vm = new FavoritesViewModel(collections, new FakeLaunchService(true));
            var server = CreateServer("1", "Favorite");

            collections.ToggleFavorite(server);
            Assert.Single(vm.Servers);

            vm.RemoveCommand.Execute(server);
            Assert.Empty(vm.Servers);
            Assert.Empty(collections.GetFavorites());
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    [Fact]
    public void RecentPageTracksCollectionChanges()
    {
        var root = CreateRoot();
        try
        {
            var collections = new ServerCollectionService(root);
            var vm = new RecentViewModel(collections, new FakeLaunchService(true));
            var server = CreateServer("1", "Recent");

            collections.AddRecent(server);

            var row = Assert.Single(vm.Servers);
            Assert.Equal("Recent", row.Name);
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    private static string CreateRoot()
    {
        var root = Path.Combine(Path.GetTempPath(), "MonarchLauncherTests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        return root;
    }

    private static DayZServer CreateServer(string id, string name)
        => new(id, name, "chernarusplus", 10, 60, 25, "127.0.0.1", 2302, 2303, "online");

    private sealed class EmptyServerService : IServerDirectoryService
    {
        public Task<ServerDirectoryResult> GetServersAsync(CancellationToken cancellationToken = default)
            => Task.FromResult(new ServerDirectoryResult(Array.Empty<DayZServer>()));
    }

    private sealed class FakeLaunchService(bool succeeds) : IDayZLaunchService
    {
        public LaunchResult Launch(DayZServer server)
            => new(succeeds, succeeds ? "Started" : "Failed");
    }
}
