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
    private string _searchText = string.Empty;
    private string _statusText = "Ready";
    private bool _isLoading;
    private DayZServer? _selectedServer;

    public ObservableCollection<DayZServer> Servers { get; } = new();
    public ICommand RefreshCommand { get; }
    public ICommand JoinCommand { get; }

    public IEnumerable<DayZServer> FilteredServers
    {
        get
        {
            if (string.IsNullOrWhiteSpace(SearchText))
                return Servers;

            var query = SearchText.Trim();
            return Servers.Where(server =>
                server.Name.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                server.Map.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                server.Address.Contains(query, StringComparison.OrdinalIgnoreCase));
        }
    }

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
        get => _searchText;
        set
        {
            if (!SetProperty(ref _searchText, value))
                return;

            OnPropertyChanged(nameof(FilteredServers));
            OnPropertyChanged(nameof(ResultCountText));
        }
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
    }

    public async Task RefreshAsync()
    {
        if (IsLoading)
            return;

        IsLoading = true;
        StatusText = "Loading live DayZ servers...";

        try
        {
            var rows = await _serverDirectoryService.GetServersAsync();
            Servers.Clear();
            foreach (var row in rows)
                Servers.Add(row);

            SelectedServer = Servers.FirstOrDefault();
            StatusText = $"Updated {DateTime.Now:t}";
            OnPropertyChanged(nameof(FilteredServers));
            OnPropertyChanged(nameof(ResultCountText));
        }
        catch (Exception ex)
        {
            Servers.Clear();
            SelectedServer = null;
            StatusText = $"Unable to load servers: {ex.Message}";
            OnPropertyChanged(nameof(FilteredServers));
            OnPropertyChanged(nameof(ResultCountText));
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
}
