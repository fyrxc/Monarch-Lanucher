using System.Buffers.Binary;
using System.Text;

namespace MonarchLauncher.App.Services;

public sealed record SteamA2SInfo(
    string Name,
    string Map,
    int Players,
    int MaxPlayers,
    int? GamePort,
    string Version);

public static class SteamA2SInfoParser
{
    private static readonly byte[] QueryText = Encoding.ASCII.GetBytes("Source Engine Query\0");

    public static byte[] BuildRequest(ReadOnlySpan<byte> challenge = default)
    {
        var length = 5 + QueryText.Length + (challenge.Length == 4 ? 4 : 0);
        var request = new byte[length];
        request[0] = 0xFF;
        request[1] = 0xFF;
        request[2] = 0xFF;
        request[3] = 0xFF;
        request[4] = 0x54;
        QueryText.CopyTo(request.AsSpan(5));
        if (challenge.Length == 4)
            challenge.CopyTo(request.AsSpan(5 + QueryText.Length));
        return request;
    }

    public static bool TryReadChallenge(ReadOnlySpan<byte> payload, out byte[] challenge)
    {
        challenge = Array.Empty<byte>();
        if (payload.Length < 9 ||
            BinaryPrimitives.ReadInt32LittleEndian(payload[..4]) != -1 ||
            payload[4] != 0x41)
            return false;

        challenge = payload.Slice(5, 4).ToArray();
        return true;
    }

    public static SteamA2SInfo? TryParse(ReadOnlySpan<byte> payload)
    {
        if (payload.Length < 6)
            return null;

        var header = BinaryPrimitives.ReadInt32LittleEndian(payload[..4]);
        if (header != -1 || payload[4] != 0x49)
            return null;

        var offset = 5;
        if (!TryReadByte(payload, ref offset, out _))
            return null;
        if (!TryReadCString(payload, ref offset, out var name) ||
            !TryReadCString(payload, ref offset, out var map) ||
            !TryReadCString(payload, ref offset, out _) ||
            !TryReadCString(payload, ref offset, out _))
            return null;

        if (!TrySkip(payload, ref offset, 2) ||
            !TryReadByte(payload, ref offset, out var players) ||
            !TryReadByte(payload, ref offset, out var maxPlayers) ||
            !TrySkip(payload, ref offset, 5) ||
            !TryReadCString(payload, ref offset, out var version))
            return null;

        int? gamePort = null;
        if (offset < payload.Length)
        {
            var edf = payload[offset++];
            if ((edf & 0x80) != 0)
            {
                if (offset + 2 > payload.Length)
                    return null;
                gamePort = BinaryPrimitives.ReadUInt16LittleEndian(payload.Slice(offset, 2));
                offset += 2;
            }

            if ((edf & 0x10) != 0 && !TrySkip(payload, ref offset, 8))
                return null;

            if ((edf & 0x40) != 0)
            {
                if (!TrySkip(payload, ref offset, 2) || !TryReadCString(payload, ref offset, out _))
                    return null;
            }

            if ((edf & 0x20) != 0 && !TryReadCString(payload, ref offset, out _))
                return null;

            if ((edf & 0x01) != 0 && !TrySkip(payload, ref offset, 8))
                return null;
        }

        return new SteamA2SInfo(name, map, players, maxPlayers, gamePort, version);
    }

    private static bool TryReadCString(ReadOnlySpan<byte> payload, ref int offset, out string value)
    {
        value = string.Empty;
        if (offset >= payload.Length)
            return false;

        var remaining = payload[offset..];
        var terminator = remaining.IndexOf((byte)0);
        if (terminator < 0)
            return false;

        value = Encoding.UTF8.GetString(remaining[..terminator]);
        offset += terminator + 1;
        return true;
    }

    private static bool TryReadByte(ReadOnlySpan<byte> payload, ref int offset, out byte value)
    {
        value = 0;
        if (offset >= payload.Length)
            return false;

        value = payload[offset++];
        return true;
    }

    private static bool TrySkip(ReadOnlySpan<byte> payload, ref int offset, int count)
    {
        if (offset + count > payload.Length)
            return false;

        offset += count;
        return true;
    }
}
