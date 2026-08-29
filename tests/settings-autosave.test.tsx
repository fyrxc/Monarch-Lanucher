import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { LauncherApi } from "../lib/api";

function createApi(): LauncherApi {
  return {
    getServers: vi.fn().mockResolvedValue({ servers: [], isPartial: false, warning: null }),
    getFavorites: vi.fn().mockResolvedValue([]),
    toggleFavorite: vi.fn().mockResolvedValue(true),
    getRecent: vi.fn().mockResolvedValue([]),
    clearRecent: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({ dayzName: "MonarchPlayer", dayzPath: "C:\\DayZ", extraLaunchParameters: "", skipBattleye: false, discordPresence: true }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getSystemStatus: vi.fn().mockResolvedValue({ steamFound: true, steamRunning: true, steamPath: "C:\\Steam\\steam.exe", steamPersonaName: "MonarchPlayer", dayzFound: true, dayzPath: "C:\\DayZ" }),
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

it("persists settings as they change without a Save Settings button", async () => {
  const api = createApi();
  render(<AppShell api={api} />);

  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  const name = await screen.findByDisplayValue("MonarchPlayer");
  fireEvent.change(name, { target: { value: "Crashout" } });

  await waitFor(() => expect(api.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ dayzName: "Crashout" })));
  expect(screen.queryByRole("button", { name: /save settings/i })).not.toBeInTheDocument();
});
