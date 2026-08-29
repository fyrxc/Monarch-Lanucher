import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { LauncherApi } from "../lib/api";

function api(): LauncherApi {
  const getSystemStatus = vi
    .fn()
    .mockResolvedValueOnce({
      steamFound: true,
      steamRunning: false,
      steamPath: "C:\\Steam\\steam.exe",
      steamPersonaName: null,
      dayzFound: true,
      dayzPath: "C:\\Steam\\steamapps\\common\\DayZ",
    })
    .mockResolvedValueOnce({
      steamFound: true,
      steamRunning: true,
      steamPath: "C:\\Steam\\steam.exe",
      steamPersonaName: "Monarch",
      dayzFound: true,
      dayzPath: "C:\\Steam\\steamapps\\common\\DayZ",
    });

  return {
    getServers: vi.fn().mockResolvedValue({ servers: [], isPartial: false, warning: null }),
    getFavorites: vi.fn().mockResolvedValue([]),
    toggleFavorite: vi.fn().mockResolvedValue(true),
    getRecent: vi.fn().mockResolvedValue([]),
    clearRecent: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({ dayzName: "", dayzPath: "", extraLaunchParameters: "", skipBattleye: false, discordPresence: true }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getSystemStatus,
    getInstalledMods: vi.fn().mockResolvedValue([]),
    updateWorkshopMod: vi.fn().mockResolvedValue(undefined),
    unsubscribeWorkshopMod: vi.fn().mockResolvedValue(undefined),
    openModFolder: vi.fn().mockResolvedValue(undefined),
    checkForUpdate: vi.fn().mockResolvedValue({ available: false, currentVersion: "0.4.1", latestVersion: null, notes: null }),
    installUpdate: vi.fn().mockResolvedValue(undefined),
    prepareServerLaunch: vi.fn().mockResolvedValue({ ready: true, missingWorkshopIds: [], dayzRunning: false }),
    setupServerMods: vi.fn().mockResolvedValue(undefined),
    getWorkshopDownloadProgress: vi.fn().mockResolvedValue([]),
    closeDayz: vi.fn().mockResolvedValue(undefined),
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

it("blocks the launcher until Steam is running and retries cleanly", async () => {
  const launcherApi = api();
  render(<AppShell api={launcherApi} />);

  expect(await screen.findByRole("dialog", { name: "Steam required" })).toBeInTheDocument();
  expect(screen.getByText(/Steam must be open/i)).toBeInTheDocument();
  expect(screen.queryByRole("table", { name: "DayZ servers" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Retry Steam" }));

  await waitFor(() => expect(launcherApi.getSystemStatus).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Steam required" })).not.toBeInTheDocument());
});
