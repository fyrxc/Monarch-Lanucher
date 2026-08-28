using System.Net;
using System.Net.Http;
using MonarchLauncher.App.Services;

namespace MonarchLauncher.App.Tests;

public sealed class DzsaServerDirectoryServiceTests
{
    [Fact]
    public async Task GetServersAsync_maps_DZSA_server_list_without_manual_queries()
    {
        const string json = """
        {
          "status": 0,
          "result": [
            {
              "name": "Monarch Test | 1PP",
              "players": 42,
              "maxPlayers": 100,
              "time": "13:15",
              "map": "chernarusplus",
              "password": false,
              "battlEye": true,
              "vac": true,
              "firstPersonOnly": true,
              "shard": "public",
              "mods": [
                { "name": "CF", "steamWorkshopId": 1559212036 }
              ],
              "version": "1.29.163709",
              "environment": "w",
              "endpoint": { "ip": "1.2.3.4", "port": 2303 },
              "gamePort": 2302
            }
          ]
        }
        """;

        using var httpClient = new HttpClient(new StaticJsonHandler(json));
        var service = new DzsaServerDirectoryService(httpClient);

        var result = await service.GetServersAsync();

        var server = Assert.Single(result.Servers);
        Assert.Equal("Monarch Test | 1PP", server.Name);
        Assert.Equal("chernarusplus", server.Map);
        Assert.Equal(42, server.Players);
        Assert.Equal(100, server.Capacity);
        Assert.Equal("1.2.3.4", server.Ip);
        Assert.Equal(2302, server.Port);
        Assert.Equal(2303, server.QueryPort);
        Assert.True(server.IsModded);
        Assert.False(server.IsPassworded);
        Assert.True(server.FirstPersonOnly);
        Assert.Equal(1, server.ModCount);
        Assert.False(result.IsPartial);
    }

    [Fact]
    public async Task GetServersAsync_skips_malformed_rows_instead_of_failing_entire_list()
    {
        const string json = """
        {
          "status": 0,
          "result": [
            { "name": "Broken" },
            {
              "name": "Good",
              "players": 1,
              "maxPlayers": 60,
              "map": "enoch",
              "password": true,
              "firstPersonOnly": false,
              "mods": [],
              "endpoint": { "ip": "5.6.7.8", "port": 2403 },
              "gamePort": 2402
            }
          ]
        }
        """;

        using var httpClient = new HttpClient(new StaticJsonHandler(json));
        var service = new DzsaServerDirectoryService(httpClient);

        var result = await service.GetServersAsync();

        var server = Assert.Single(result.Servers);
        Assert.Equal("Good", server.Name);
        Assert.True(server.IsPassworded);
    }

    private sealed class StaticJsonHandler : HttpMessageHandler
    {
        private readonly string _json;

        public StaticJsonHandler(string json) => _json = json;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(_json)
            });
    }
}
