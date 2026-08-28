using System.Net;
using System.Text;

namespace MonarchLauncher.App.Services;

public static class SteamMasterProtocol
{
    private static readonly byte[] ExpectedHeader = { 0xFF, 0xFF, 0xFF, 0xFF, 0x66, 0x0A };

    public static byte[] BuildRequest(string startAddress, string filter)
    {
        using var stream = new MemoryStream();
        stream.WriteByte((byte)'1');
        stream.WriteByte(0xFF); // all regions
        WriteCString(stream, startAddress);
        WriteCString(stream, filter);
        return stream.ToArray();
    }

    public static IReadOnlyList<IPEndPoint> ParseResponse(ReadOnlySpan<byte> payload)
    {
        var endpoints = new List<IPEndPoint>();
        if (payload.Length < ExpectedHeader.Length || !payload[..ExpectedHeader.Length].SequenceEqual(ExpectedHeader))
            return endpoints;

        var offset = ExpectedHeader.Length;
        while (offset + 6 <= payload.Length)
        {
            var address = new IPAddress(payload.Slice(offset, 4).ToArray());
            var port = (payload[offset + 4] << 8) | payload[offset + 5];
            endpoints.Add(new IPEndPoint(address, port));
            offset += 6;
        }

        return endpoints;
    }

    private static void WriteCString(Stream stream, string value)
    {
        var bytes = Encoding.ASCII.GetBytes(value);
        stream.Write(bytes, 0, bytes.Length);
        stream.WriteByte(0);
    }
}
