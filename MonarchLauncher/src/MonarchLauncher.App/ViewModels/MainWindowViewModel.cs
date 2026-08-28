using System.Collections.ObjectModel;
using System.Reflection;
using System.Windows.Input;
using MonarchLauncher.App.Commands;
using MonarchLauncher.App.Models;
using MonarchLauncher.App.Services;

namespace MonarchLauncher.App.ViewModels;

public sealed class MainWindowViewModel : ViewModelBase
{
    private readonly Dictionary<string, ViewModelBase> _pages;
    private readonly IUpdateService _updateService;
    private NavigationItem _selectedNavigationItem;
    private ViewModelBase _currentPage;
    private string _updateStatus = "Ready";
    private string _updateButtonText = "Check for Updates";
    private bool _isUpdating;

    public ObservableCollection<NavigationItem> NavigationItems { get; }
    public ICommand NavigateCommand { get; }
    public ICommand CheckForUpdatesCommand { get; }
    public event Action? ShutdownRequested;

    public string LauncherVersion { get; }

    public NavigationItem SelectedNavigationItem
    {
        get => _selectedNavigationItem;
        set
        {
            if (!SetProperty(ref _selectedNavigationItem, value) || value is null)
                return;

            NavigateTo(value.Key);
        }
    }

    public ViewModelBase CurrentPage
    {
        get => _currentPage;
        private set => SetProperty(ref _currentPage, value);
    }

    public string UpdateStatus
    {
        get => _updateStatus;
        private set => SetProperty(ref _updateStatus, value);
    }

    public string UpdateButtonText
    {
        get => _updateButtonText;
        private set => SetProperty(ref _updateButtonText, value);
    }

    public bool IsUpdating
    {
        get => _isUpdating;
        private set => SetProperty(ref _isUpdating, value);
    }

    public MainWindowViewModel(
        IServerDirectoryService serverDirectoryService,
        IDayZLaunchService launchService,
        IUpdateService updateService,
        UserSettingsService? userSettingsService = null,
        ServerCollectionService? serverCollectionService = null)
    {
        _updateService = updateService;
        LauncherVersion = GetDisplayVersion();
        userSettingsService ??= new UserSettingsService();
        serverCollectionService ??= new ServerCollectionService();

        NavigationItems = new ObservableCollection<NavigationItem>
        {
            new("servers", "Servers", "≡"),
            new("favorites", "Favorites", "☆"),
            new("recent", "Recent", "↺"),
            new("mods", "Mods", "▦"),
            new("settings", "Settings", "⚙")
        };

        _pages = new Dictionary<string, ViewModelBase>(StringComparer.OrdinalIgnoreCase)
        {
            ["servers"] = new ServersViewModel(serverDirectoryService, launchService, serverCollectionService),
            ["favorites"] = new FavoritesViewModel(serverCollectionService, launchService),
            ["recent"] = new RecentViewModel(serverCollectionService, launchService),
            ["mods"] = new ModsViewModel(),
            ["settings"] = new SettingsViewModel(userSettingsService)
        };

        _selectedNavigationItem = NavigationItems[0];
        _currentPage = _pages["servers"];

        NavigateCommand = new RelayCommand(parameter =>
        {
            if (parameter is string key)
                NavigateTo(key);
        });

        CheckForUpdatesCommand = new AsyncRelayCommand(CheckForUpdatesAsync, () => !IsUpdating);
    }

    private void NavigateTo(string key)
    {
        if (!_pages.TryGetValue(key, out var page))
            return;

        CurrentPage = page;
        var item = NavigationItems.FirstOrDefault(x => string.Equals(x.Key, key, StringComparison.OrdinalIgnoreCase));
        if (item is not null && !ReferenceEquals(_selectedNavigationItem, item))
        {
            _selectedNavigationItem = item;
            OnPropertyChanged(nameof(SelectedNavigationItem));
        }
    }

    private async Task CheckForUpdatesAsync()
    {
        if (IsUpdating)
            return;

        IsUpdating = true;
        UpdateButtonText = "Checking...";
        UpdateStatus = "Checking GitHub...";

        try
        {
            var currentVersion = ParseDisplayVersion(LauncherVersion);
            var update = await _updateService.CheckAsync(currentVersion);
            if (!update.IsUpdateAvailable)
            {
                UpdateStatus = update.Message;
                UpdateButtonText = "Check for Updates";
                return;
            }

            UpdateButtonText = $"Updating to v{update.LatestVersion}";
            var progress = new Progress<double>(value =>
                UpdateStatus = $"Downloading update... {value:0}%");

            var packagePath = await _updateService.DownloadAsync(update, progress);
            UpdateStatus = "Installing update...";
            _updateService.StartUpdater(packagePath);
            ShutdownRequested?.Invoke();
        }
        catch (Exception ex)
        {
            UpdateStatus = $"Update failed: {ex.Message}";
            UpdateButtonText = "Check for Updates";
        }
        finally
        {
            IsUpdating = false;
        }
    }

    private static string GetDisplayVersion()
    {
        var version = Assembly.GetExecutingAssembly().GetName().Version ?? new Version(0, 2, 0);
        return $"{version.Major}.{version.Minor}.{Math.Max(0, version.Build)}";
    }

    private static Version ParseDisplayVersion(string value)
        => Version.TryParse(value, out var version) ? version : new Version(0, 0, 0);
}
