using System.Collections.ObjectModel;
using System.Windows.Input;
using MonarchLauncher.App.Commands;
using MonarchLauncher.App.Models;
using MonarchLauncher.App.Services;

namespace MonarchLauncher.App.ViewModels;

public sealed class ModsViewModel : ViewModelBase
{
    private readonly IModDirectoryService _modDirectoryService;
    private string _searchText = string.Empty;
    private string _statusText = "Ready";
    private bool _isLoading;

    public ObservableCollection<InstalledMod> Mods { get; } = new();
    public ICommand RefreshCommand { get; }

    public IEnumerable<InstalledMod> FilteredMods => Mods.Where(MatchesSearch);

    public string ResultCountText
    {
        get
        {
            var count = FilteredMods.Count();
            return count == 1 ? "1 mod" : $"{count} mods";
        }
    }

    public string SearchText
    {
        get => _searchText;
        set
        {
            var next = value ?? string.Empty;
            if (!SetProperty(ref _searchText, next))
                return;

            OnPropertyChanged(nameof(FilteredMods));
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

    public ModsViewModel(IModDirectoryService? modDirectoryService = null)
    {
        _modDirectoryService = modDirectoryService ?? new SteamWorkshopModService();
        RefreshCommand = new AsyncRelayCommand(RefreshAsync, () => !IsLoading);
    }

    public async Task RefreshAsync()
    {
        if (IsLoading)
            return;

        IsLoading = true;
        StatusText = "Scanning Steam Workshop...";

        try
        {
            var mods = await _modDirectoryService.GetInstalledModsAsync();
            Mods.Clear();
            foreach (var mod in mods)
                Mods.Add(mod);

            StatusText = Mods.Count == 0
                ? "No installed DayZ Workshop mods found."
                : $"Updated {DateTime.Now:t}";
        }
        catch (Exception ex)
        {
            Mods.Clear();
            StatusText = $"Unable to scan mods: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
            OnPropertyChanged(nameof(FilteredMods));
            OnPropertyChanged(nameof(ResultCountText));
        }
    }

    private bool MatchesSearch(InstalledMod mod)
    {
        if (string.IsNullOrWhiteSpace(SearchText))
            return true;

        return mod.Name.Contains(SearchText, StringComparison.OrdinalIgnoreCase)
            || mod.WorkshopId.Contains(SearchText, StringComparison.OrdinalIgnoreCase)
            || mod.Path.Contains(SearchText, StringComparison.OrdinalIgnoreCase);
    }
}
