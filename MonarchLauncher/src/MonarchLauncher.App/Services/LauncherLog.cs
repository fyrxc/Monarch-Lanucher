namespace MonarchLauncher.App.Services;

public static class LauncherLog
{
    public static string LogPath => GetLogPath();

    public static string GetLogPath(string? rootDirectory = null)
    {
        var root = rootDirectory ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Monarch Lanucher",
            "Logs");
        return Path.Combine(root, "launcher.log");
    }

    public static void Write(string message, Exception? exception = null, string? rootDirectory = null)
    {
        try
        {
            var path = GetLogPath(rootDirectory);
            var directory = Path.GetDirectoryName(path);
            if (!string.IsNullOrWhiteSpace(directory))
                Directory.CreateDirectory(directory);

            var timestamp = DateTimeOffset.Now.ToString("O");
            var line = $"[{timestamp}] {message}";
            if (exception is not null)
                line += Environment.NewLine + exception;
            line += Environment.NewLine;

            File.AppendAllText(path, line);
        }
        catch
        {
            // Logging must never become a second startup failure.
        }
    }
}
