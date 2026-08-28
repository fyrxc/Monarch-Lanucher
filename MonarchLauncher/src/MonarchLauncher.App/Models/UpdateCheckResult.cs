namespace MonarchLauncher.App.Models;

public sealed record UpdateCheckResult(
    bool IsConfigured,
    bool IsUpdateAvailable,
    Version CurrentVersion,
    Version? LatestVersion,
    string Message,
    Uri? DownloadUri);
