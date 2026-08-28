namespace MonarchLauncher.App.Models;

public sealed class LauncherSettings
{
    public string GitHubOwner { get; init; } = string.Empty;
    public string GitHubRepository { get; init; } = string.Empty;
    public string UpdateAssetName { get; init; } = "MonarchLanucher-win-x64.zip";
}
