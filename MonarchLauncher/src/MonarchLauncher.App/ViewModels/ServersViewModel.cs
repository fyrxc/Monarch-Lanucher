using System.Collections.ObjectModel;
using System.Windows.Input;
using MonarchLauncher.App.Commands;
using MonarchLauncher.App.Models;
using MonarchLauncher.App.Services;

namespace MonarchLauncher.App.ViewModels;

public sealed class ServersViewModel : ViewModelBase
{
    private readonly IServerDirectoryService _serverDirectoryService;
    private readonly IDayZLaunchService _launchService;
    private readonly ServerFilterState _filters = new();
    private string _statusText = "Ready";
    private bool _isLoading;
    private DayZServer? _selectedServer;
    private string _selectedMap = "All Maps";

    public ObservableCollection<DayZServer> Servers { get; } = new();
    public ICommand RefreshCommand { get; }
    public ICommand JoinCommand { get; }
    public ICommand ClearFiltersCommand { get; }

    public IEnumerable<DayZServer> FilteredServers => Servers.Where(_filters.Matches);

    public IEnumerable<string> AvailableMaps => new[] { "All Maps" }
        .Concat(Servers
            .Select(server => server.Map)
            .Where(map => !string.IsNullOrWhiteSpace(map))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(map => map, StringComparer.OrdinalIgnoreCase));

    public string ResultCountText
    {
        get
        {
            var count = FilteredServers.Count();
            return count == 1 ? "1 server" : $"{count} servers";
        }
    }

    public string SearchText
    {
        get => _filters.SearchText;
        set
        {
            if (string.Equals(_filters.SearchText, value, StringComparison.Ordinal))
                return;
            _filters.SearchText = value ?? string.Empty;
            RefreshFilteredServers();
            OnPropertyChanged();
        }
    }

    public string SelectedMap
    {
        get => _selectedMap;
        set
        {
            var next = string.IsNullOrWhiteSpace(value) ? "All Maps" : value;
            if (string.Equals(_selectedMap, next, StringComparison.OrdinalIgnoreCase))
                return;
            _selectedMap = next;
            _filters.Map = string.Equals(next, "All Maps", StringComparison.OrdinalIgnoreCase) ? string.Empty : next;
            RefreshFilteredServers();
            OnPropertyChanged();
        }
    }

    public int? MinPlayers
    {
        get => _filters.MinPlayers;
        set { if (_filters.MinPlayers == value) return; _filters.MinPlayers = value; RefreshFilteredServers(); OnPropertyChanged(); }
    }

    public int? MaxPlayers
    {
        get => _filters.MaxPlayers;
        set { if (_filters.MaxPlayers == value) return; _filters.MaxPlayers = value; RefreshFilteredServers(); OnPropertyChanged(); }
    }

    public int? MaxPing
    {
        get => _filters.MaxPing;
        set { if (_filters.MaxPing == value) return; _filters.MaxPing = value; RefreshFilteredServers(); OnPropertyChanged(); }
    }

    public bool HideEmpty
    {
        get => _filters.HideEmpty;
        set { if (_filters.HideEmpty == value) return; _filters.HideEmpty = value; RefreshFilteredServers(); OnPropertyChanged(); }
    }

    public bool HideFull
    {
        get => _filters.HideFull;
        set { if (_filters.HideFull == value) return; _filters.HideFull = value; RefreshFilteredServers(); OnPropertyChanged(); }
    }

    public bool? ModdedFilter
    {
        get => _filters.Modded;
        set { if (_filters.Modded == value) return; _filters.Modded = value; RefreshFilteredServers(); OnPropertyChanged(); }
    }

    public bool? PasswordFilter
    {
        get => _filters.Passworded;
        set { if (_filters.Passworded == value) return; _filters.Passworded = value; RefreshFilteredServers(); OnPropertyChanged(); }
    }

    public bool? OfficialFilter
    {
        get => _filters.Official;
        set { if (_filters.Official == value) return; _filters.Official = value; RefreshFilteredServers(); OnPropertyChanged(); }
    }

    public bool? FirstPersonOnlyFilter
    {
        get => _filters.FirstPersonOnly;
        set { if (_filters.FirstPersonOnly == value) return; _filters.FirstPersonOnly = value; RefreshFilteredServers(); OnPropertyChanged(); }
    }

    public string StatusText
    {
        get => _statusText;
        private set => SetProperty(ref _statusText, value);
    }

    public bool IsLoading
    {
        get => _isLoading;
        private set => SetProperty(ref _isLoading, value);
    }

    public DayZServer? SelectedServer
    {
        get => _selectedServer;
        set => SetProperty(ref _selectedServer, value);
    }

    public ServersViewModel(IServerDirectoryService serverDirectoryService, IDayZLaunchService launchService)
    {
        _serverDirectoryService = serverDirectoryService;
        _launchService = launchService;
        RefreshCommand = new AsyncRelayCommand(RefreshAsync, () => !IsLoading);
        JoinCommand = new RelayCommand(JoinServer);
        ClearFiltersCommand = new RelayCommand(_ => ClearFilters());
    }

    public async Task RefreshAsync()
    {
        if (IsLoading)
            return;

        IsLoading = true;
        StatusText = "Loading DayZ servers...";

        try
        {
            var result = await _serverDirectoryService.GetServersAsync();
            Servers.Clear();
            foreach (var row in result.Servers)
                Servers.Add(row);

            SelectedServer = Servers.FirstOrDefault();
            StatusText = result.IsPartial && !string.IsNullOrWhiteSpace(result.Warning)
                ? result.Warning
                : $"Updated {DateTime.Now:t}";

            RefreshFilteredServers();
            OnPropertyChanged(nameof(AvailableMaps));
        }
        catch (Exception ex)
        {
            Servers.Clear();
            SelectedServer = null;
            StatusText = $"Unable to load servers: {ex.Message}";
            RefreshFilteredServers();
            OnPropertyChanged(nameof(AvailableMaps));
        }
        finally
        {
            IsLoading = false;
        }
    }

    private void JoinServer(object? parameter)
    {
        if (parameter is not DayZServer server)
            return;

        SelectedServer = server;
        var result = _launchService.Launch(server);
        StatusText = result.Message;
    }

    private void ClearFilters()
    {
        _filters.SearchText = string.Empty;
        _filters.Map = string.Empty;
        _filters.MinPlayers = null;
        _filters.MaxPlayers = null;
        _filters.MaxPing = null;
        _filters.HideEmpty = false;
        _filters.HideFull = false;
        _filters.Modded = null;
        _filters.Passworded = null;
        _filters.Official = null;
        _filters.FirstPersonOnly = null;
        _selectedMap = "All Maps";

        OnPropertyChanged(nameof(SearchText));
        OnPropertyChanged(nameof(SelectedMap));
        OnPropertyChanged(nameof(MinPlayers));
        OnPropertyChanged(nameof(MaxPlayers));
        OnPropertyChanged(nameof(MaxPing));
        OnPropertyChanged(nameof(HideEmpty));
        OnPropertyChanged(nameof(HideFull));
        OnPropertyChanged(nameof(ModdedFilter));
        OnPropertyChanged(nameof(PasswordFilter));
        OnPropertyChanged(nameof(OfficialFilter));
        OnPropertyChanged(nameof(FirstPersonOnlyFilter));
        RefreshFilteredServers();
    }

    private void RefreshFilteredServers()
    {
        OnPropertyChanged(nameof(FilteredServers));
        OnPropertyChanged(nameof(ResultCountText));
    }
}
