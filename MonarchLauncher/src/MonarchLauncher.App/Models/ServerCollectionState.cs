namespace MonarchLauncher.App.Models;

public sealed class ServerCollectionState
{
    public List<DayZServer> Favorites { get; set; } = new();
    public List<DayZServer> Recent { get; set; } = new();
}
