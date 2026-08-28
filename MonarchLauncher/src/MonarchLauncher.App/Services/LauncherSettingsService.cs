using System.Text.Json;
using MonarchLauncher.App.Models;

namespace MonarchLauncher.App.Services;

public static class LauncherSettingsService
{
    public static LauncherSettings Load(string? path = null)
    {
        path ??= Path.Combine(AppContext.BaseDirectory, "launcher-settings.json");

        if (!File.Exists(path))
            return new LauncherSettings();

        try
        {
            var json = File.ReadAllText(path);
            return JsonSerializer.Deserialize<LauncherSettings>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new LauncherSettings();
        }
        catch
        {
            return new LauncherSettings();
        }
    }
}
