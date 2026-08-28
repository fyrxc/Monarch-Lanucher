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
    string Status)
{
    public string PlayerDisplay => $"{Players}/{Capacity}";
    public string PingDisplay => Ping > 0 ? $"{Ping} ms" : "—";
    public string Address => string.IsNullOrWhiteSpace(Ip) ? "Unknown" : $"{Ip}:{Port}";
    public bool IsOnline => string.Equals(Status, "online", StringComparison.OrdinalIgnoreCase);
}
