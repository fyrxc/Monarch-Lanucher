using System.Collections.ObjectModel;
using System.Windows.Input;
using MonarchLauncher.App.Commands;
using MonarchLauncher.App.Models;
using MonarchLauncher.App.Services;

namespace MonarchLauncher.App.ViewModels;

public sealed class RecentViewModel : ViewModelBase
{
    private readonly ServerCollectionService _serverCollectionService;
    private readonly IDayZLaunchService _launchService;
    private string _statusText = "Recently joined servers are saved on this PC.";

    public ObservableCollection<DayZServer> Servers { get; } = new();
    public ICommand JoinCommand { get; }
    public ICommand ClearCommand { get; }

    public string ResultCountText => Servers.Count == 1 ? "1 server" : $"{Servers.Count} servers";

    public string StatusText
    {
        get => _statusText;
        private set => SetProperty(ref _statusText, value);
    }

    public RecentViewModel(ServerCollectionService serverCollectionService, IDayZLaunchService launchService)
    {
        _serverCollectionService = serverCollectionService;
        _launchService = launchService;
        JoinCommand = new RelayCommand(JoinServer);
        ClearCommand = new RelayCommand(_ => ClearRecent());
        _serverCollectionService.RecentChanged += Reload;
        Reload();
    }

    private void Reload()
    {
        Servers.Clear();
        foreach (var server in _serverCollectionService.GetRecent())
            Servers.Add(server);
        OnPropertyChanged(nameof(ResultCountText));
    }

    private void JoinServer(object? parameter)
    {
        if (parameter is not DayZServer server)
            return;

        var result = _launchService.Launch(server);
        if (result.Success)
            _serverCollectionService.AddRecent(server);
        StatusText = result.Message;
    }

    private void ClearRecent()
    {
        _serverCollectionService.ClearRecent();
        StatusText = "Recent servers cleared.";
    }
}
