using MonarchLauncher.App.Models;

namespace MonarchLauncher.App.Services;

public interface IModDirectoryService
{
    Task<IReadOnlyList<InstalledMod>> GetInstalledModsAsync(CancellationToken cancellationToken = default);
}
