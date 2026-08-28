using System.Diagnostics;
using Microsoft.Win32;
using MonarchLauncher.App.Models;

namespace MonarchLauncher.App.Services;

public sealed class SteamDayZLaunchService : IDayZLaunchService
{
    private const int DayZAppId = 221100;
    private readonly Func<UserSettings> _loadUserSettings;

    public SteamDayZLaunchService(Func<UserSettings>? loadUserSettings = null)
    {
        _loadUserSettings = loadUserSettings ?? (() => new UserSettings());
    }

    public LaunchResult Launch(DayZServer server)
    {
        try
        {
            var steamExe = FindSteamExecutable();
            if (steamExe is null)
                return new LaunchResult(false, "Steam was not found on this PC.");

            var settings = _loadUserSettings();
            var arguments = BuildArguments(server, settings.DayZName);
            Process.Start(new ProcessStartInfo
            {
                FileName = steamExe,
                Arguments = arguments,
                UseShellExecute = true
            });

            return new LaunchResult(true, $"Launching {server.Name}. Mod sync comes next.");
        }
        catch (Exception ex)
        {
            return new LaunchResult(false, $"Could not launch DayZ: {ex.Message}");
        }
    }

    private static string BuildArguments(DayZServer server, string dayZName)
    {
        var arguments = $"-applaunch {DayZAppId} -connect={server.Ip} -port={server.Port}";
        var trimmedName = dayZName?.Trim() ?? string.Empty;
        if (trimmedName.Length == 0)
            return arguments;

        var escapedName = trimmedName.Replace("\\", "\\\\", StringComparison.Ordinal)
                                     .Replace("\"", "\\\"", StringComparison.Ordinal);
        return $"{arguments} -name=\"{escapedName}\"";
    }

    private static string? FindSteamExecutable()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"Software\Valve\Steam");
            if (key?.GetValue("SteamExe") is string steamExe && File.Exists(steamExe))
                return steamExe;
        }
        catch
        {
            // Fall through to the standard install location.
        }

        var standardPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
            "Steam",
            "steam.exe");

        return File.Exists(standardPath) ? standardPath : null;
    }
}
