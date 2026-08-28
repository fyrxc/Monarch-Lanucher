using MonarchLauncher.App.Models;

namespace MonarchLauncher.App.Services;

public interface IDayZLaunchService
{
    LaunchResult Launch(DayZServer server);
}
