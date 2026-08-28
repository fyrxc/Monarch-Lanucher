using MonarchLauncher.App.Services;

namespace MonarchLauncher.App.Tests;

public sealed class LauncherLogTests
{
    [Fact]
    public void WriteCreatesLogContainingMessageAndException()
    {
        var root = Path.Combine(Path.GetTempPath(), "MonarchLauncherTests", Guid.NewGuid().ToString("N"));
        try
        {
            LauncherLog.Write("startup failed", new InvalidOperationException("boom"), root);

            var path = LauncherLog.GetLogPath(root);
            Assert.True(File.Exists(path));
            var text = File.ReadAllText(path);
            Assert.Contains("startup failed", text);
            Assert.Contains(nameof(InvalidOperationException), text);
            Assert.Contains("boom", text);
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }
}
