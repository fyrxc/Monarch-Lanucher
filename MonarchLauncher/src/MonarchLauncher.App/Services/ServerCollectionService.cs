using System.Text.Json;
using MonarchLauncher.App.Models;

namespace MonarchLauncher.App.Services;

public sealed class ServerCollectionService
{
    private const int MaxRecentServers = 20;
    private readonly string _rootDirectory;
    private readonly string _statePath;

    public ServerCollectionService(string? rootDirectory = null)
    {
        _rootDirectory = rootDirectory ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Monarch Lanucher");
        _statePath = Path.Combine(_rootDirectory, "servers.json");
    }

    public event Action? FavoritesChanged;
    public event Action? RecentChanged;

    public IReadOnlyList<DayZServer> GetFavorites() => Load().Favorites;

    public IReadOnlyList<DayZServer> GetRecent() => Load().Recent;

    public bool ToggleFavorite(DayZServer server)
    {
        ArgumentNullException.ThrowIfNull(server);
        var state = Load();
        var index = state.Favorites.FindIndex(existing => SameServer(existing, server));

        if (index >= 0)
        {
            state.Favorites.RemoveAt(index);
            Save(state);
            FavoritesChanged?.Invoke();
            return false;
        }

        state.Favorites.Add(server);
        Save(state);
        FavoritesChanged?.Invoke();
        return true;
    }

    public void RemoveFavorite(DayZServer server)
    {
        ArgumentNullException.ThrowIfNull(server);
        var state = Load();
        var removed = state.Favorites.RemoveAll(existing => SameServer(existing, server)) > 0;
        if (!removed)
            return;

        Save(state);
        FavoritesChanged?.Invoke();
    }

    public void AddRecent(DayZServer server)
    {
        ArgumentNullException.ThrowIfNull(server);
        var state = Load();
        state.Recent.RemoveAll(existing => SameServer(existing, server));
        state.Recent.Insert(0, server);

        if (state.Recent.Count > MaxRecentServers)
            state.Recent.RemoveRange(MaxRecentServers, state.Recent.Count - MaxRecentServers);

        Save(state);
        RecentChanged?.Invoke();
    }

    public void ClearRecent()
    {
        var state = Load();
        if (state.Recent.Count == 0)
            return;

        state.Recent.Clear();
        Save(state);
        RecentChanged?.Invoke();
    }

    private ServerCollectionState Load()
    {
        if (!File.Exists(_statePath))
            return new ServerCollectionState();

        try
        {
            var json = File.ReadAllText(_statePath);
            var state = JsonSerializer.Deserialize<ServerCollectionState>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new ServerCollectionState();

            state.Favorites ??= new List<DayZServer>();
            state.Recent ??= new List<DayZServer>();
            return state;
        }
        catch
        {
            return new ServerCollectionState();
        }
    }

    private void Save(ServerCollectionState state)
    {
        Directory.CreateDirectory(_rootDirectory);
        var json = JsonSerializer.Serialize(state, new JsonSerializerOptions
        {
            WriteIndented = true
        });
        File.WriteAllText(_statePath, json);
    }

    private static bool SameServer(DayZServer left, DayZServer right)
    {
        if (!string.IsNullOrWhiteSpace(left.Id) && !string.IsNullOrWhiteSpace(right.Id))
            return string.Equals(left.Id, right.Id, StringComparison.OrdinalIgnoreCase);

        return string.Equals(left.Ip, right.Ip, StringComparison.OrdinalIgnoreCase)
            && left.Port == right.Port;
    }
}
