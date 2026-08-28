using System.Net.Http;
using System.Net.Http.Headers;
using System.Windows;
using System.Windows.Threading;
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

        DispatcherUnhandledException += OnDispatcherUnhandledException;
        AppDomain.CurrentDomain.UnhandledException += OnDomainUnhandledException;

        try
        {
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
            var viewModel = new MainWindowViewModel(serverDirectoryService, launchService, updateService, userSettingsService);
            viewModel.ShutdownRequested += Shutdown;

            var window = new MainWindow
            {
                DataContext = viewModel
            };

            window.Show();
        }
        catch (Exception ex)
        {
            LauncherLog.Write("Launcher startup failed.", ex);
            MessageBox.Show(
                $"Monarch Lanucher could not start.\n\nA crash log was saved to:\n{LauncherLog.LogPath}",
                "Monarch Lanucher",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
            Shutdown(1);
        }
    }

    protected override void OnExit(ExitEventArgs e)
    {
        DispatcherUnhandledException -= OnDispatcherUnhandledException;
        AppDomain.CurrentDomain.UnhandledException -= OnDomainUnhandledException;
        _httpClient?.Dispose();
        base.OnExit(e);
    }

    private void OnDispatcherUnhandledException(object sender, DispatcherUnhandledExceptionEventArgs e)
    {
        LauncherLog.Write("Unhandled UI exception.", e.Exception);
        MessageBox.Show(
            $"Monarch Lanucher hit an unexpected error.\n\nA crash log was saved to:\n{LauncherLog.LogPath}",
            "Monarch Lanucher",
            MessageBoxButton.OK,
            MessageBoxImage.Error);
        e.Handled = true;
        Shutdown(1);
    }

    private static void OnDomainUnhandledException(object? sender, UnhandledExceptionEventArgs e)
    {
        LauncherLog.Write("Unhandled application exception.", e.ExceptionObject as Exception);
    }
}
