using MonarchLauncher.App.Models;

namespace MonarchLauncher.App.Services;

public interface IServerDirectoryService
{
    Task<ServerDirectoryResult> GetServersAsync(CancellationToken cancellationToken = default);
}
