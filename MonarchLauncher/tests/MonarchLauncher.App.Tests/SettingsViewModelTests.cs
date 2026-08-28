using MonarchLauncher.App.Models;
using MonarchLauncher.App.Services;
using MonarchLauncher.App.ViewModels;

namespace MonarchLauncher.App.Tests;

public sealed class SettingsViewModelTests
{
    [Fact]
    public void LoadsSavedDayZName()
    {
        var root = NewTempRoot();
        try
        {
            var service = new UserSettingsService(root);
            service.Save(new UserSettings { DayZName = "Saved Player" });

            var vm = new SettingsViewModel(service);

            Assert.Equal("Saved Player", vm.DayZName);
        }
        finally
        {
            Cleanup(root);
        }
    }

    [Fact]
    public void SaveCommandPersistsTrimmedNameAndShowsSavedStatus()
    {
        var root = NewTempRoot();
        try
        {
            var service = new UserSettingsService(root);
            var vm = new SettingsViewModel(service)
            {
                DayZName = "  Monarch Player  "
            };

            vm.SaveCommand.Execute(null);

            Assert.Equal("Monarch Player", service.Load().DayZName);
            Assert.Equal("Monarch Player", vm.DayZName);
            Assert.Equal("Saved", vm.StatusText);
        }
        finally
        {
            Cleanup(root);
        }
    }

    private static string NewTempRoot()
        => Path.Combine(Path.GetTempPath(), "MonarchLauncherTests", Guid.NewGuid().ToString("N"));

    private static void Cleanup(string root)
    {
        if (Directory.Exists(root))
            Directory.Delete(root, true);
    }
}
