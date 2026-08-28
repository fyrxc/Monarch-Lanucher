using MonarchLauncher.App.Models;
using MonarchLauncher.App.Services;
using MonarchLauncher.App.ViewModels;

namespace MonarchLauncher.App.Tests;

public sealed class SteamWorkshopModServiceTests
{
    [Fact]
    public async Task ScansDayZWorkshopFoldersAndReadsMetaName()
    {
        var root = CreateRoot();
        try
        {
            var modRoot = Path.Combine(root, "steamapps", "workshop", "content", "221100");
            var namedMod = Path.Combine(modRoot, "123456789");
            var unnamedMod = Path.Combine(modRoot, "987654321");
            Directory.CreateDirectory(namedMod);
            Directory.CreateDirectory(unnamedMod);
            File.WriteAllText(Path.Combine(namedMod, "meta.cpp"), "name = \"Monarch Core\";\n");

            var service = new SteamWorkshopModService(root);
            var mods = await service.GetInstalledModsAsync();

            Assert.Equal(2, mods.Count);
            Assert.Contains(mods, mod => mod.WorkshopId == "123456789" && mod.Name == "Monarch Core");
            Assert.Contains(mods, mod => mod.WorkshopId == "987654321" && mod.Name.Contains("987654321", StringComparison.Ordinal));
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    [Fact]
    public async Task ScansAdditionalSteamLibraryFromLibraryFoldersVdf()
    {
        var root = CreateRoot();
        var library = CreateRoot();
        try
        {
            Directory.CreateDirectory(Path.Combine(root, "steamapps"));
            var escapedLibrary = library.Replace("\\", "\\\\");
            File.WriteAllText(
                Path.Combine(root, "steamapps", "libraryfolders.vdf"),
                $"\"libraryfolders\"\n{{\n  \"1\"\n  {{\n    \"path\" \"{escapedLibrary}\"\n  }}\n}}\n");

            var modPath = Path.Combine(library, "steamapps", "workshop", "content", "221100", "555");
            Directory.CreateDirectory(modPath);
            File.WriteAllText(Path.Combine(modPath, "meta.cpp"), "name = \"Library Mod\";\n");

            var service = new SteamWorkshopModService(root);
            var mods = await service.GetInstalledModsAsync();

            var mod = Assert.Single(mods);
            Assert.Equal("555", mod.WorkshopId);
            Assert.Equal("Library Mod", mod.Name);
        }
        finally
        {
            Directory.Delete(root, true);
            Directory.Delete(library, true);
        }
    }

    [Fact]
    public async Task ModsViewModelLoadsInstalledModsAndFiltersByName()
    {
        var service = new FakeModDirectoryService(
            new InstalledMod("1", "Monarch Core", @"C:\\Mods\\1"),
            new InstalledMod("2", "Other Mod", @"C:\\Mods\\2"));
        var vm = new ModsViewModel(service);

        await vm.RefreshAsync();
        vm.SearchText = "Monarch";

        Assert.Equal(2, vm.Mods.Count);
        var filtered = Assert.Single(vm.FilteredMods);
        Assert.Equal("Monarch Core", filtered.Name);
        Assert.Equal("1 mod", vm.ResultCountText);
        Assert.Contains("Updated", vm.StatusText, StringComparison.OrdinalIgnoreCase);
    }

    private static string CreateRoot()
    {
        var root = Path.Combine(Path.GetTempPath(), "MonarchLauncherTests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        return root;
    }

    private sealed class FakeModDirectoryService(params InstalledMod[] mods) : IModDirectoryService
    {
        public Task<IReadOnlyList<InstalledMod>> GetInstalledModsAsync(CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<InstalledMod>>(mods);
    }
}
