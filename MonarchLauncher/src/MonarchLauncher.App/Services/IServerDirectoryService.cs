using MonarchLauncher.App.Models;

namespace MonarchLauncher.App.Services;

public interface IServerDirectoryService
{
    Task<IReadOnlyList<DayZServer>> GetServersAsync(CancellationToken cancellationToken = default);
}
