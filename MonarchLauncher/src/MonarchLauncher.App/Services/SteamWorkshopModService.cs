using System.Text.RegularExpressions;
using Microsoft.Win32;
using MonarchLauncher.App.Models;

namespace MonarchLauncher.App.Services;

public sealed class SteamWorkshopModService : IModDirectoryService
{
    private const string DayZWorkshopAppId = "221100";
    private static readonly Regex LibraryPathRegex = new(
        "\\\"path\\\"\\s*\\\"([^\\\"]+)\\\"",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex ModNameRegex = new(
        "\\bname\\s*=\\s*\\\"([^\\\"]+)\\\"\\s*;",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly string? _steamDirectory;

    public SteamWorkshopModService(string? steamDirectory = null)
    {
        _steamDirectory = steamDirectory;
    }

    public Task<IReadOnlyList<InstalledMod>> GetInstalledModsAsync(CancellationToken cancellationToken = default)
        => Task.Run<IReadOnlyList<InstalledMod>>(() => ScanInstalledMods(cancellationToken), cancellationToken);

    private IReadOnlyList<InstalledMod> ScanInstalledMods(CancellationToken cancellationToken)
    {
        var steamDirectory = _steamDirectory ?? FindSteamDirectory();
        if (string.IsNullOrWhiteSpace(steamDirectory) || !Directory.Exists(steamDirectory))
            return Array.Empty<InstalledMod>();

        var mods = new Dictionary<string, InstalledMod>(StringComparer.OrdinalIgnoreCase);
        foreach (var library in GetSteamLibraries(steamDirectory))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var workshopRoot = Path.Combine(library, "steamapps", "workshop", "content", DayZWorkshopAppId);
            if (!Directory.Exists(workshopRoot))
                continue;

            IEnumerable<string> directories;
            try
            {
                directories = Directory.EnumerateDirectories(workshopRoot);
            }
            catch
            {
                continue;
            }

            foreach (var directory in directories)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var workshopId = Path.GetFileName(directory);
                if (string.IsNullOrWhiteSpace(workshopId) || !workshopId.All(char.IsDigit))
                    continue;

                mods[workshopId] = new InstalledMod(
                    workshopId,
                    ReadModName(directory, workshopId),
                    directory);
            }
        }

        return mods.Values
            .OrderBy(mod => mod.Name, StringComparer.OrdinalIgnoreCase)
            .ThenBy(mod => mod.WorkshopId, StringComparer.Ordinal)
            .ToArray();
    }

    private static IEnumerable<string> GetSteamLibraries(string steamDirectory)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (seen.Add(Path.GetFullPath(steamDirectory)))
            yield return Path.GetFullPath(steamDirectory);

        var libraryFile = Path.Combine(steamDirectory, "steamapps", "libraryfolders.vdf");
        if (!File.Exists(libraryFile))
            yield break;

        string content;
        try
        {
            content = File.ReadAllText(libraryFile);
        }
        catch
        {
            yield break;
        }

        foreach (Match match in LibraryPathRegex.Matches(content))
        {
            var rawPath = match.Groups[1].Value.Replace("\\\\", "\\");
            if (string.IsNullOrWhiteSpace(rawPath))
                continue;

            string fullPath;
            try
            {
                fullPath = Path.GetFullPath(rawPath);
            }
            catch
            {
                continue;
            }

            if (seen.Add(fullPath))
                yield return fullPath;
        }
    }

    private static string ReadModName(string directory, string workshopId)
    {
        var metaPath = Path.Combine(directory, "meta.cpp");
        if (!File.Exists(metaPath))
            return $"Workshop {workshopId}";

        try
        {
            var content = File.ReadAllText(metaPath);
            var match = ModNameRegex.Match(content);
            if (match.Success && !string.IsNullOrWhiteSpace(match.Groups[1].Value))
                return match.Groups[1].Value.Trim();
        }
        catch
        {
            // Fall back to the workshop ID below.
        }

        return $"Workshop {workshopId}";
    }

    private static string? FindSteamDirectory()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"Software\Valve\Steam");
            if (key?.GetValue("SteamPath") is string steamPath && Directory.Exists(steamPath))
                return steamPath.Replace('/', Path.DirectorySeparatorChar);

            if (key?.GetValue("SteamExe") is string steamExe)
            {
                var directory = Path.GetDirectoryName(steamExe);
                if (!string.IsNullOrWhiteSpace(directory) && Directory.Exists(directory))
                    return directory;
            }
        }
        catch
        {
            // Fall through to the standard install path.
        }

        var standardPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
            "Steam");

        return Directory.Exists(standardPath) ? standardPath : null;
    }
}
