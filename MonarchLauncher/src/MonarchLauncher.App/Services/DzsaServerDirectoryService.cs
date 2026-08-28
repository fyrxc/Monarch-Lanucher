using System.Net.Http;
using System.Text.Json;
using MonarchLauncher.App.Models;

namespace MonarchLauncher.App.Services;

public sealed class DzsaServerDirectoryService : IServerDirectoryService
{
    private static readonly Uri DirectoryUri = new("https://dayzsalauncher.com/api/v1/launcher/servers/dayz");
    private readonly HttpClient _httpClient;

    public DzsaServerDirectoryService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<ServerDirectoryResult> GetServersAsync(CancellationToken cancellationToken = default)
    {
        using var response = await _httpClient.GetAsync(DirectoryUri, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var root = document.RootElement;

        if (root.TryGetProperty("status", out var statusElement) &&
            statusElement.ValueKind == JsonValueKind.Number &&
            statusElement.TryGetInt32(out var status) && status != 0)
        {
            throw new InvalidOperationException($"DayZ server directory returned status {status}.");
        }

        if (!root.TryGetProperty("result", out var resultElement) || resultElement.ValueKind != JsonValueKind.Array)
            throw new InvalidOperationException("DayZ server directory returned an invalid response.");

        var servers = new List<DayZServer>(resultElement.GetArrayLength());
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in resultElement.EnumerateArray())
        {
            if (!TryMapServer(row, out var server) || server is null)
                continue;

            if (seen.Add(server.Id))
                servers.Add(server);
        }

        return new ServerDirectoryResult(
            servers
                .OrderByDescending(server => server.Players)
                .ThenBy(server => server.Name, StringComparer.OrdinalIgnoreCase)
                .ToArray());
    }

    private static bool TryMapServer(JsonElement row, out DayZServer? server)
    {
        server = null;

        if (row.ValueKind != JsonValueKind.Object)
            return false;

        var name = GetString(row, "name");
        if (string.IsNullOrWhiteSpace(name))
            return false;

        if (!row.TryGetProperty("endpoint", out var endpoint) || endpoint.ValueKind != JsonValueKind.Object)
            return false;

        var ip = GetString(endpoint, "ip");
        var gamePort = GetInt(row, "gamePort");
        if (string.IsNullOrWhiteSpace(ip) || gamePort <= 0)
            return false;

        var queryPort = GetInt(endpoint, "port");
        if (queryPort <= 0)
            queryPort = gamePort + 1;

        var mods = row.TryGetProperty("mods", out var modsElement) && modsElement.ValueKind == JsonValueKind.Array
            ? modsElement.GetArrayLength()
            : 0;

        var id = GetString(row, "id");
        if (string.IsNullOrWhiteSpace(id))
            id = $"{ip}:{gamePort}";

        var map = GetString(row, "map");
        if (string.IsNullOrWhiteSpace(map))
            map = "DayZ";

        var status = GetString(row, "status");
        if (string.IsNullOrWhiteSpace(status))
            status = "online";

        server = new DayZServer(
            id,
            name,
            map,
            Math.Max(0, GetInt(row, "players")),
            Math.Max(0, GetInt(row, "maxPlayers")),
            0,
            ip,
            gamePort,
            queryPort,
            status,
            mods > 0,
            GetBool(row, "password"),
            GetBool(row, "official"),
            GetBool(row, "firstPersonOnly"),
            GetString(row, "country") ?? string.Empty,
            mods);

        return true;
    }

    private static string? GetString(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var value))
            return null;

        return value.ValueKind == JsonValueKind.String ? value.GetString() : null;
    }

    private static int GetInt(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var value))
            return 0;

        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number))
            return number;

        return value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), out number)
            ? number
            : 0;
    }

    private static bool GetBool(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var value))
            return false;

        return value.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Number when value.TryGetInt32(out var number) => number != 0,
            JsonValueKind.String when bool.TryParse(value.GetString(), out var boolean) => boolean,
            _ => false
        };
    }
}
