namespace MonarchLauncher.App.Models;

public sealed record DayZServer(
    string Id,
    string Name,
    string Map,
    int Players,
    int Capacity,
    int Ping,
    string Ip,
    int Port,
    int QueryPort,
    string Status,
    bool IsModded = false,
    bool IsPassworded = false,
    bool IsOfficial = false,
    bool FirstPersonOnly = false,
    string Country = "",
    int ModCount = 0)
{
    public string PlayerDisplay => $"{Players}/{Capacity}";
    public string PingDisplay => Ping > 0 ? $"{Ping} ms" : "—";
    public string Address => string.IsNullOrWhiteSpace(Ip) ? "Unknown" : $"{Ip}:{Port}";
    public bool IsOnline => string.Equals(Status, "online", StringComparison.OrdinalIgnoreCase);
    public string ModDisplay => IsModded ? $"{Math.Max(1, ModCount)} mods" : "Vanilla";
    public string PerspectiveDisplay => FirstPersonOnly ? "1PP" : "3PP";
}
