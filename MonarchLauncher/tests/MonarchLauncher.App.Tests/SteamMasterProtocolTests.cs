using System.Net;
using MonarchLauncher.App.Services;

namespace MonarchLauncher.App.Tests;

public sealed class SteamMasterProtocolTests
{
    [Fact]
    public void ParsesMasterServerEndpointBatch()
    {
        var response = new byte[]
        {
            0xFF, 0xFF, 0xFF, 0xFF, 0x66, 0x0A,
            168, 100, 163, 22, 0x69, 0x88,
            64, 40, 8, 34, 0x69, 0x88,
            0, 0, 0, 0, 0, 0
        };

        var endpoints = SteamMasterProtocol.ParseResponse(response);

        Assert.Equal(3, endpoints.Count);
        Assert.Equal(IPAddress.Parse("168.100.163.22"), endpoints[0].Address);
        Assert.Equal(27016, endpoints[0].Port);
        Assert.Equal(IPAddress.Any, endpoints[2].Address);
        Assert.Equal(0, endpoints[2].Port);
    }

    [Fact]
    public void RequestContainsDayZAppIdFilter()
    {
        var request = SteamMasterProtocol.BuildRequest("0.0.0.0:0", @"\appid\221100");
        var text = System.Text.Encoding.ASCII.GetString(request);

        Assert.Equal((byte)'1', request[0]);
        Assert.Equal(0xFF, request[1]);
        Assert.Contains(@"\appid\221100", text, StringComparison.Ordinal);
    }
}
