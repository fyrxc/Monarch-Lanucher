using MonarchLauncher.App.Models;

namespace MonarchLauncher.App.Tests;

public sealed class ServerFilterStateTests
{
    [Fact]
    public void Matches_hides_empty_and_full_servers_when_requested()
    {
        var empty = Server(players: 0, capacity: 60);
        var full = Server(players: 60, capacity: 60);
        var filters = new ServerFilterState { HideEmpty = true, HideFull = true };

        Assert.False(filters.Matches(empty));
        Assert.False(filters.Matches(full));
    }

    [Fact]
    public void Matches_applies_search_map_modded_password_and_perspective()
    {
        var server = Server(
            name: "Monarch Chernarus 1PP",
            map: "chernarusplus",
            isModded: true,
            isPassworded: false,
            firstPersonOnly: true);

        var filters = new ServerFilterState
        {
            SearchText = "Monarch",
            Map = "chernarusplus",
            Modded = true,
            Passworded = false,
            FirstPersonOnly = true
        };

        Assert.True(filters.Matches(server));
    }

    [Fact]
    public void Matches_applies_player_limits_and_max_ping()
    {
        var server = Server(players: 30, capacity: 100, ping: 55);
        var filters = new ServerFilterState
        {
            MinPlayers = 20,
            MaxPlayers = 40,
            MaxPing = 60
        };

        Assert.True(filters.Matches(server));
        filters.MaxPing = 40;
        Assert.False(filters.Matches(server));
    }

    private static DayZServer Server(
        string name = "Test Server",
        string map = "chernarusplus",
        int players = 10,
        int capacity = 60,
        int ping = 25,
        bool isModded = false,
        bool isPassworded = false,
        bool firstPersonOnly = false)
        => new(
            "1",
            name,
            map,
            players,
            capacity,
            ping,
            "127.0.0.1",
            2302,
            2303,
            "online",
            isModded,
            isPassworded,
            false,
            firstPersonOnly,
            "US",
            isModded ? 4 : 0);
}
