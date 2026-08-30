using System.Diagnostics;
using System.IO.Compression;

namespace MonarchLauncher.Updater;

internal static class Program
{
    private static int Main(string[] args)
    {
        try
        {
            var options = ParseArguments(args);
            var pid = int.Parse(Require(options, "pid"));
            var packagePath = Path.GetFullPath(Require(options, "package"));
            var targetDirectory = Path.GetFullPath(Require(options, "target"));
            var launcherExe = Path.GetFullPath(Require(options, "launch"));

            WaitForLauncher(pid);

            if (!File.Exists(packagePath))
                throw new FileNotFoundException("Update package was not found.", packagePath);

            var stagingDirectory = Path.Combine(Path.GetTempPath(), "MonarchLanucher", "staging", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(stagingDirectory);
            ZipFile.ExtractToDirectory(packagePath, stagingDirectory, overwriteFiles: true);

            CopyDirectory(stagingDirectory, targetDirectory);

            try
            {
                Directory.Delete(stagingDirectory, recursive: true);
                File.Delete(packagePath);
            }
            catch
            {
                // Cleanup failure should not prevent relaunch.
            }

            if (File.Exists(launcherExe))
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = launcherExe,
                    WorkingDirectory = targetDirectory,
                    UseShellExecute = true
                });
            }

            return 0;
        }
        catch (Exception ex)
        {
            var logPath = Path.Combine(Path.GetTempPath(), "MonarchLanucher-update-error.log");
            File.WriteAllText(logPath, ex.ToString());
            return 1;
        }
    }

    private static Dictionary<string, string> ParseArguments(string[] args)
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        for (var index = 0; index < args.Length; index += 2)
        {
            if (index + 1 >= args.Length || !args[index].StartsWith("--", StringComparison.Ordinal))
                throw new ArgumentException("Updater arguments must be supplied as --name value pairs.");

            values[args[index][2..]] = args[index + 1];
        }

        return values;
    }

    private static string Require(IReadOnlyDictionary<string, string> values, string key)
    {
        if (!values.TryGetValue(key, out var value) || string.IsNullOrWhiteSpace(value))
            throw new ArgumentException($"Missing required updater argument --{key}.");

        return value;
    }

    private static void WaitForLauncher(int pid)
    {
        try
        {
            using var process = Process.GetProcessById(pid);
            process.WaitForExit(30_000);
        }
        catch (ArgumentException)
        {
            // Launcher already exited.
        }
    }

    private static void CopyDirectory(string sourceDirectory, string targetDirectory)
    {
        Directory.CreateDirectory(targetDirectory);

        foreach (var directory in Directory.EnumerateDirectories(sourceDirectory, "*", SearchOption.AllDirectories))
        {
            var relative = Path.GetRelativePath(sourceDirectory, directory);
            Directory.CreateDirectory(Path.Combine(targetDirectory, relative));
        }

        foreach (var file in Directory.EnumerateFiles(sourceDirectory, "*", SearchOption.AllDirectories))
        {
            var relative = Path.GetRelativePath(sourceDirectory, file);
            var destination = Path.Combine(targetDirectory, relative);
            Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
            File.Copy(file, destination, overwrite: true);
        }
    }
}
