using MonarchLauncher.App.Models;
using MonarchLauncher.App.Services;

namespace MonarchLauncher.App.Tests;

public sealed class UserSettingsServiceTests
{
    [Fact]
    public void SaveThenLoadRoundTripsDayZName()
    {
        var root = Path.Combine(Path.GetTempPath(), "MonarchLauncherTests", Guid.NewGuid().ToString("N"));
        try
        {
            var service = new UserSettingsService(root);
            service.Save(new UserSettings { DayZName = "Monarch Player" });

            var loaded = service.Load();

            Assert.Equal("Monarch Player", loaded.DayZName);
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public void InvalidSettingsFileReturnsDefaults()
    {
        var root = Path.Combine(Path.GetTempPath(), "MonarchLauncherTests", Guid.NewGuid().ToString("N"));
        try
        {
            Directory.CreateDirectory(root);
            File.WriteAllText(Path.Combine(root, "settings.json"), "not-json");
            var service = new UserSettingsService(root);

            var loaded = service.Load();

            Assert.Equal(string.Empty, loaded.DayZName);
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }
}
