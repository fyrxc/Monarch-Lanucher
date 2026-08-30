using System.Net;
using System.Text;
using MonarchLauncher.App.Models;
using MonarchLauncher.App.Services;

namespace MonarchLauncher.App.Tests;

public sealed class GitHubUpdateServiceTests
{
    [Fact]
    public async Task FindsNewerReleaseAndMatchingWindowsAsset()
    {
        const string json = """
        {
          "tag_name": "v0.3.0",
          "assets": [
            {
              "name": "MonarchLanucher-win-x64.zip",
              "browser_download_url": "https://github.com/example/monarch/releases/download/v0.3.0/MonarchLanucher-win-x64.zip"
            }
          ]
        }
        """;

        using var httpClient = new HttpClient(new StaticJsonHandler(json));
        var settings = new LauncherSettings
        {
            GitHubOwner = "example",
            GitHubRepository = "monarch",
            UpdateAssetName = "MonarchLanucher-win-x64.zip"
        };
        var service = new GitHubUpdateService(httpClient, settings);

        var result = await service.CheckAsync(new Version(0, 2, 0));

        Assert.True(result.IsConfigured);
        Assert.True(result.IsUpdateAvailable);
        Assert.Equal(new Version(0, 3, 0), result.LatestVersion);
        Assert.NotNull(result.DownloadUri);
    }

    [Fact]
    public async Task UnconfiguredRepositoryDoesNotCallGitHub()
    {
        using var httpClient = new HttpClient(new ThrowingHandler());
        var service = new GitHubUpdateService(httpClient, new LauncherSettings());

        var result = await service.CheckAsync(new Version(0, 2, 0));

        Assert.False(result.IsConfigured);
        Assert.False(result.IsUpdateAvailable);
        Assert.Contains("GitHub", result.Message, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class StaticJsonHandler(string json) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            });
        }
    }

    private sealed class ThrowingHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => throw new InvalidOperationException("HTTP should not be called when updater is unconfigured.");
    }
}
