using System.Diagnostics;
using System.Text.Json;
using MonarchLauncher.App.Models;

namespace MonarchLauncher.App.Services;

public sealed class GitHubUpdateService : IUpdateService
{
    private readonly HttpClient _httpClient;
    private readonly LauncherSettings _settings;

    public GitHubUpdateService(HttpClient httpClient, LauncherSettings settings)
    {
        _httpClient = httpClient;
        _settings = settings;
    }

    public async Task<UpdateCheckResult> CheckAsync(Version currentVersion, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.GitHubOwner) || string.IsNullOrWhiteSpace(_settings.GitHubRepository))
        {
            return new UpdateCheckResult(
                false,
                false,
                currentVersion,
                null,
                "GitHub updates are not configured in this local build.",
                null);
        }

        var url = $"https://api.github.com/repos/{Uri.EscapeDataString(_settings.GitHubOwner)}/{Uri.EscapeDataString(_settings.GitHubRepository)}/releases/latest";
        using var response = await _httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

        var tagName = document.RootElement.TryGetProperty("tag_name", out var tag)
            ? tag.GetString() ?? string.Empty
            : string.Empty;

        if (!TryParseVersion(tagName, out var latestVersion))
        {
            return new UpdateCheckResult(true, false, currentVersion, null, "Latest GitHub release has an invalid version tag.", null);
        }

        Uri? downloadUri = null;
        if (document.RootElement.TryGetProperty("assets", out var assets) && assets.ValueKind == JsonValueKind.Array)
        {
            foreach (var asset in assets.EnumerateArray())
            {
                var name = asset.TryGetProperty("name", out var nameElement) ? nameElement.GetString() : null;
                if (!string.Equals(name, _settings.UpdateAssetName, StringComparison.OrdinalIgnoreCase))
                    continue;

                var download = asset.TryGetProperty("browser_download_url", out var urlElement) ? urlElement.GetString() : null;
                if (Uri.TryCreate(download, UriKind.Absolute, out var parsedUri))
                    downloadUri = parsedUri;
                break;
            }
        }

        if (latestVersion <= currentVersion)
        {
            return new UpdateCheckResult(true, false, currentVersion, latestVersion, "Monarch Lanucher is up to date.", downloadUri);
        }

        if (downloadUri is null)
        {
            return new UpdateCheckResult(true, false, currentVersion, latestVersion, $"v{latestVersion} exists, but {_settings.UpdateAssetName} is missing from the release.", null);
        }

        return new UpdateCheckResult(true, true, currentVersion, latestVersion, $"v{latestVersion} is available.", downloadUri);
    }

    public async Task<string> DownloadAsync(UpdateCheckResult update, IProgress<double>? progress = null, CancellationToken cancellationToken = default)
    {
        if (!update.IsUpdateAvailable || update.DownloadUri is null || update.LatestVersion is null)
            throw new InvalidOperationException("No downloadable update is available.");

        var updateDirectory = Path.Combine(Path.GetTempPath(), "MonarchLanucher", "updates", update.LatestVersion.ToString());
        Directory.CreateDirectory(updateDirectory);
        var destination = Path.Combine(updateDirectory, _settings.UpdateAssetName);

        using var response = await _httpClient.GetAsync(update.DownloadUri, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();

        var total = response.Content.Headers.ContentLength;
        await using var source = await response.Content.ReadAsStreamAsync(cancellationToken);
        await using var target = new FileStream(destination, FileMode.Create, FileAccess.Write, FileShare.None, 81920, useAsync: true);

        var buffer = new byte[81920];
        long received = 0;
        int read;
        while ((read = await source.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken)) > 0)
        {
            await target.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
            received += read;
            if (total is > 0)
                progress?.Report(received * 100d / total.Value);
        }

        progress?.Report(100);
        return destination;
    }

    public void StartUpdater(string packagePath)
    {
        var sourceUpdater = Path.Combine(AppContext.BaseDirectory, "MonarchLauncher.Updater.exe");
        if (!File.Exists(sourceUpdater))
            throw new FileNotFoundException("The updater executable is missing from the launcher folder.", sourceUpdater);

        var tempDirectory = Path.Combine(Path.GetTempPath(), "MonarchLanucher", "updater", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDirectory);
        var tempUpdater = Path.Combine(tempDirectory, "MonarchLauncher.Updater.exe");
        File.Copy(sourceUpdater, tempUpdater, overwrite: true);

        var targetDirectory = AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var launcherExe = Path.Combine(targetDirectory, "MonarchLauncher.App.exe");

        var startInfo = new ProcessStartInfo
        {
            FileName = tempUpdater,
            UseShellExecute = true,
            WorkingDirectory = tempDirectory
        };
        startInfo.ArgumentList.Add("--pid");
        startInfo.ArgumentList.Add(Environment.ProcessId.ToString());
        startInfo.ArgumentList.Add("--package");
        startInfo.ArgumentList.Add(packagePath);
        startInfo.ArgumentList.Add("--target");
        startInfo.ArgumentList.Add(targetDirectory);
        startInfo.ArgumentList.Add("--launch");
        startInfo.ArgumentList.Add(launcherExe);

        Process.Start(startInfo);
    }

    private static bool TryParseVersion(string value, out Version version)
    {
        var trimmed = value.Trim();
        if (trimmed.StartsWith('v') || trimmed.StartsWith('V'))
            trimmed = trimmed[1..];

        var dashIndex = trimmed.IndexOf('-');
        if (dashIndex >= 0)
            trimmed = trimmed[..dashIndex];

        if (Version.TryParse(trimmed, out var parsed))
        {
            version = parsed;
            return true;
        }

        version = new Version(0, 0, 0);
        return false;
    }
}
