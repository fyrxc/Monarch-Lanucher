using MonarchLauncher.App.Models;

namespace MonarchLauncher.App.Services;

public interface IUpdateService
{
    Task<UpdateCheckResult> CheckAsync(Version currentVersion, CancellationToken cancellationToken = default);
    Task<string> DownloadAsync(UpdateCheckResult update, IProgress<double>? progress = null, CancellationToken cancellationToken = default);
    void StartUpdater(string packagePath);
}
