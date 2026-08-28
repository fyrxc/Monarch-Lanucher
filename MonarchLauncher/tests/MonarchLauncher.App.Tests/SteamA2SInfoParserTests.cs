using System.Text;
using MonarchLauncher.App.Services;

namespace MonarchLauncher.App.Tests;

public sealed class SteamA2SInfoParserTests
{
    [Fact]
    public void ParsesSourceInfoIncludingGamePort()
    {
        using var stream = new MemoryStream();
        using var writer = new BinaryWriter(stream, Encoding.UTF8, leaveOpen: true);
        writer.Write(-1);
        writer.Write((byte)0x49);
        writer.Write((byte)17);
        WriteCString(writer, "Crashout PVP");
        WriteCString(writer, "chernarusplus");
        WriteCString(writer, "dayz");
        WriteCString(writer, "DayZ");
        writer.Write((ushort)(221100 & 0xFFFF));
        writer.Write((byte)52);
        writer.Write((byte)100);
        writer.Write((byte)0);
        writer.Write((byte)'d');
        writer.Write((byte)'w');
        writer.Write((byte)0);
        writer.Write((byte)1);
        WriteCString(writer, "1.29.0");
        writer.Write((byte)0x80);
        writer.Write((ushort)2302);
        writer.Flush();

        var info = SteamA2SInfoParser.TryParse(stream.ToArray());

        Assert.NotNull(info);
        Assert.Equal("Crashout PVP", info.Name);
        Assert.Equal("chernarusplus", info.Map);
        Assert.Equal(52, info.Players);
        Assert.Equal(100, info.MaxPlayers);
        Assert.Equal(2302, info.GamePort);
    }

    [Fact]
    public void ReturnsNullForSplitPacketHeader()
    {
        var payload = new byte[] { 0xFE, 0xFF, 0xFF, 0xFF, 0x49 };
        Assert.Null(SteamA2SInfoParser.TryParse(payload));
    }

    private static void WriteCString(BinaryWriter writer, string value)
    {
        writer.Write(Encoding.UTF8.GetBytes(value));
        writer.Write((byte)0);
    }
}
