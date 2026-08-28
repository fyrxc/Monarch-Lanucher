using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using MonarchLauncher.App.Models;

namespace MonarchLauncher.App.Services;

public sealed class SteamMasterServerDirectoryService : IServerDirectoryService
{
    private const string MasterHost = "hl2master.steampowered.com";
    private const int MasterPort = 27011;
    private const string DayZFilter = @"\appid\221100";
    private const int MaxCandidates = 220;
    private const int MaxResults = 120;
    private static readonly TimeSpan MasterTimeout = TimeSpan.FromSeconds(4);
    private static readonly TimeSpan QueryTimeout = TimeSpan.FromMilliseconds(1400);

    public async Task<IReadOnlyList<DayZServer>> GetServersAsync(CancellationToken cancellationToken = default)
    {
        var endpoints = await QueryMasterAsync(cancellationToken);
        if (endpoints.Count == 0)
            return Array.Empty<DayZServer>();

        using var semaphore = new SemaphoreSlim(36);
        var tasks = endpoints.Select(async endpoint =>
        {
            await semaphore.WaitAsync(cancellationToken);
            try
            {
                return await QueryInfoAsync(endpoint, cancellationToken);
            }
            catch
            {
                return null;
            }
            finally
            {
                semaphore.Release();
            }
        }).ToArray();

        var rows = await Task.WhenAll(tasks);
        return rows
            .Where(server => server is not null)
            .Select(server => server!)
            .OrderByDescending(server => server.Players)
            .ThenBy(server => server.Ping)
            .Take(MaxResults)
            .ToArray();
    }

    private static async Task<IReadOnlyList<IPEndPoint>> QueryMasterAsync(CancellationToken cancellationToken)
    {
        var addresses = await Dns.GetHostAddressesAsync(MasterHost);
        var masterAddress = addresses.FirstOrDefault(address => address.AddressFamily == AddressFamily.InterNetwork)
            ?? throw new InvalidOperationException("Steam master server did not resolve to an IPv4 address.");

        using var client = new UdpClient(AddressFamily.InterNetwork);
        client.Connect(new IPEndPoint(masterAddress, MasterPort));

        var found = new List<IPEndPoint>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var startAddress = "0.0.0.0:0";

        for (var page = 0; page < 16 && found.Count < MaxCandidates; page++)
        {
            var request = SteamMasterProtocol.BuildRequest(startAddress, DayZFilter);
            await client.SendAsync(request, request.Length);
            var response = await client.ReceiveAsync().WaitAsync(MasterTimeout, cancellationToken);
            var batch = SteamMasterProtocol.ParseResponse(response.Buffer);
            if (batch.Count == 0)
                break;

            var reachedEnd = false;
            IPEndPoint? last = null;
            foreach (var endpoint in batch)
            {
                if (endpoint.Address.Equals(IPAddress.Any) && endpoint.Port == 0)
                {
                    reachedEnd = true;
                    break;
                }

                last = endpoint;
                var key = endpoint.ToString();
                if (seen.Add(key))
                    found.Add(endpoint);

                if (found.Count >= MaxCandidates)
                    break;
            }

            if (reachedEnd || last is null || found.Count >= MaxCandidates)
                break;

            startAddress = last.ToString();
        }

        return found;
    }

    private static async Task<DayZServer?> QueryInfoAsync(IPEndPoint queryEndpoint, CancellationToken cancellationToken)
    {
        using var client = new UdpClient(AddressFamily.InterNetwork);
        client.Connect(queryEndpoint);

        var stopwatch = Stopwatch.StartNew();
        var request = SteamA2SInfoParser.BuildRequest();
        await client.SendAsync(request, request.Length);
        var response = await client.ReceiveAsync().WaitAsync(QueryTimeout, cancellationToken);
        var payload = response.Buffer;

        if (SteamA2SInfoParser.TryReadChallenge(payload, out var challenge))
        {
            stopwatch.Restart();
            request = SteamA2SInfoParser.BuildRequest(challenge);
            await client.SendAsync(request, request.Length);
            response = await client.ReceiveAsync().WaitAsync(QueryTimeout, cancellationToken);
            payload = response.Buffer;
        }

        stopwatch.Stop();
        var info = SteamA2SInfoParser.TryParse(payload);
        if (info is null || string.IsNullOrWhiteSpace(info.Name))
            return null;

        var gamePort = info.GamePort.GetValueOrDefault(queryEndpoint.Port);
        return new DayZServer(
            queryEndpoint.ToString(),
            info.Name,
            string.IsNullOrWhiteSpace(info.Map) ? "DayZ" : info.Map,
            info.Players,
            info.MaxPlayers,
            Math.Max(1, (int)Math.Round(stopwatch.Elapsed.TotalMilliseconds)),
            queryEndpoint.Address.ToString(),
            gamePort,
            queryEndpoint.Port,
            "online");
    }
}
