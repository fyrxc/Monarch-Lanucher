namespace MonarchLauncher.App.Models;

public sealed record ServerDirectoryResult(
    IReadOnlyList<DayZServer> Servers,
    bool IsPartial = false,
    string? Warning = null);
