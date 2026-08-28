using System.Reflection;
using MonarchLauncher.App.Models;
using MonarchLauncher.App.Services;

namespace MonarchLauncher.App.Tests;

public sealed class SteamDayZLaunchServiceTests
{
    [Fact]
    public void BuildArgumentsIncludesQuotedDayZName()
    {
        var method = typeof(SteamDayZLaunchService).GetMethod(
            "BuildArguments",
            BindingFlags.Static | BindingFlags.NonPublic);
        Assert.NotNull(method);

        var server = new DayZServer(
            "1", "Server", "chernarusplus", 10, 60, 0,
            "1.2.3.4", 2302, 2303, "online");

        var value = Assert.IsType<string>(method!.Invoke(null, new object[] { server, "Monarch Player" }));

        Assert.Equal("-applaunch 221100 -connect=1.2.3.4 -port=2302 -name=\"Monarch Player\"", value);
    }

    [Fact]
    public void BuildArgumentsOmitsNameWhenBlank()
    {
        var method = typeof(SteamDayZLaunchService).GetMethod(
            "BuildArguments",
            BindingFlags.Static | BindingFlags.NonPublic);
        Assert.NotNull(method);

        var server = new DayZServer(
            "1", "Server", "chernarusplus", 10, 60, 0,
            "1.2.3.4", 2302, 2303, "online");

        var value = Assert.IsType<string>(method!.Invoke(null, new object[] { server, " " }));

        Assert.Equal("-applaunch 221100 -connect=1.2.3.4 -port=2302", value);
    }
}
