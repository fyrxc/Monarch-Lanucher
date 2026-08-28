namespace MonarchLauncher.App.Models;

public sealed class ServerFilterState
{
    public string SearchText { get; set; } = string.Empty;
    public string Map { get; set; } = string.Empty;
    public int? MinPlayers { get; set; }
    public int? MaxPlayers { get; set; }
    public int? MaxPing { get; set; }
    public bool HideEmpty { get; set; }
    public bool HideFull { get; set; }
    public bool FavoritesOnly { get; set; }
    public bool? Modded { get; set; }
    public bool? Passworded { get; set; }
    public bool? Official { get; set; }
    public bool? FirstPersonOnly { get; set; }

    public bool Matches(DayZServer server)
    {
        if (!string.IsNullOrWhiteSpace(SearchText))
        {
            var query = SearchText.Trim();
            if (!server.Name.Contains(query, StringComparison.OrdinalIgnoreCase) &&
                !server.Map.Contains(query, StringComparison.OrdinalIgnoreCase) &&
                !server.Address.Contains(query, StringComparison.OrdinalIgnoreCase))
                return false;
        }

        if (!string.IsNullOrWhiteSpace(Map) &&
            !string.Equals(server.Map, Map.Trim(), StringComparison.OrdinalIgnoreCase))
            return false;

        if (MinPlayers is { } minPlayers && server.Players < minPlayers)
            return false;

        if (MaxPlayers is { } maxPlayers && server.Players > maxPlayers)
            return false;

        if (MaxPing is { } maxPing && (server.Ping <= 0 || server.Ping > maxPing))
            return false;

        if (HideEmpty && server.Players <= 0)
            return false;

        if (HideFull && server.Capacity > 0 && server.Players >= server.Capacity)
            return false;

        if (Modded is { } modded && server.IsModded != modded)
            return false;

        if (Passworded is { } passworded && server.IsPassworded != passworded)
            return false;

        if (Official is { } official && server.IsOfficial != official)
            return false;

        if (FirstPersonOnly is { } firstPersonOnly && server.FirstPersonOnly != firstPersonOnly)
            return false;

        return true;
    }
}
