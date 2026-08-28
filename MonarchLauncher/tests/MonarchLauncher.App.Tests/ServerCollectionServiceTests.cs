using MonarchLauncher.App.Models;
using MonarchLauncher.App.Services;

namespace MonarchLauncher.App.Tests;

public sealed class ServerCollectionServiceTests
{
    [Fact]
    public void ToggleFavoritePersistsAddAndRemove()
    {
        var root = Path.Combine(Path.GetTempPath(), "MonarchLauncherTests", Guid.NewGuid().ToString("N"));
        try
        {
            var service = new ServerCollectionService(root);
            var server = CreateServer("1", "Monarch Test");

            Assert.True(service.ToggleFavorite(server));
            Assert.Single(service.GetFavorites());
            Assert.Equal("Monarch Test", service.GetFavorites()[0].Name);

            var reloaded = new ServerCollectionService(root);
            Assert.Single(reloaded.GetFavorites());
            Assert.False(reloaded.ToggleFavorite(server));
            Assert.Empty(reloaded.GetFavorites());
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public void AddRecentDeduplicatesAndKeepsMostRecentFirst()
    {
        var root = Path.Combine(Path.GetTempPath(), "MonarchLauncherTests", Guid.NewGuid().ToString("N"));
        try
        {
            var service = new ServerCollectionService(root);
            var first = CreateServer("1", "First");
            var second = CreateServer("2", "Second");

            service.AddRecent(first);
            service.AddRecent(second);
            service.AddRecent(first with { Players = 42 });

            var recent = service.GetRecent();
            Assert.Equal(2, recent.Count);
            Assert.Equal("First", recent[0].Name);
            Assert.Equal(42, recent[0].Players);
            Assert.Equal("Second", recent[1].Name);
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    private static DayZServer CreateServer(string id, string name)
        => new(id, name, "chernarusplus", 10, 60, 25, "127.0.0.1", 2302, 2303, "online");
}
