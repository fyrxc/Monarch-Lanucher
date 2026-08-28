using System.Net.Http;
using System.Net.Http.Headers;
using System.Windows;
using MonarchLauncher.App.Services;
using MonarchLauncher.App.ViewModels;
using MonarchLauncher.App.Views;

namespace MonarchLauncher.App;

public partial class App : Application
{
    private HttpClient? _httpClient;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        var settings = LauncherSettingsService.Load();
        var userSettingsService = new UserSettingsService();
        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(30)
        };
        _httpClient.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("MonarchLanucher", "0.4"));
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var serverDirectoryService = new DzsaServerDirectoryService(_httpClient);
        var launchService = new SteamDayZLaunchService(userSettingsService.Load);
        var updateService = new GitHubUpdateService(_httpClient, settings);
        var viewModel = new MainWindowViewModel(serverDirectoryService, launchService, updateService);
        viewModel.ShutdownRequested += Shutdown;

        var window = new MainWindow
        {
            DataContext = viewModel
        };

        window.Show();
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _httpClient?.Dispose();
        base.OnExit(e);
    }
}
