using System.Windows.Input;
using MonarchLauncher.App.Commands;
using MonarchLauncher.App.Models;
using MonarchLauncher.App.Services;

namespace MonarchLauncher.App.ViewModels;

public sealed class SettingsViewModel : ViewModelBase
{
    private readonly UserSettingsService _settingsService;
    private string _dayZName;
    private string _statusText = string.Empty;

    public string Title => "Settings";
    public ICommand SaveCommand { get; }

    public string DayZName
    {
        get => _dayZName;
        set => SetProperty(ref _dayZName, value ?? string.Empty);
    }

    public string StatusText
    {
        get => _statusText;
        private set => SetProperty(ref _statusText, value);
    }

    public SettingsViewModel(UserSettingsService? settingsService = null)
    {
        _settingsService = settingsService ?? new UserSettingsService();
        _dayZName = _settingsService.Load().DayZName;
        SaveCommand = new RelayCommand(_ => Save());
    }

    private void Save()
    {
        DayZName = DayZName.Trim();
        _settingsService.Save(new UserSettings { DayZName = DayZName });
        StatusText = "Saved";
    }
}
