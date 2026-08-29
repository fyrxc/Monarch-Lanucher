import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { LauncherApi } from "../lib/api";
import type { DayzServer } from "../lib/models";

const server: DayzServer = {
  id: "running-dayz",
  name: "Monarch Daily Driver",
  map: "chernarusplus",
  players: 48,
  capacity: 100,
  ping: 31,
  ip: "10.0.0.30",
  gamePort: 2302,
  queryPort: 2303,
  status: "online",
  isPassworded: false,
  isOfficial: false,
  firstPersonOnly: false,
  country: "",
  requiredWorkshopIds: [],
};

function createApi(): LauncherApi {
  return {
    getServers: vi.fn().mockResolvedValue({ servers: [server], isPartial: false, warning: null }),
    getFavorites: vi.fn().mockResolvedValue([]),
    toggleFavorite: vi.fn().mockResolvedValue(true),
    getRecent: vi.fn().mockResolvedValue([]),
    clearRecent: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({ dayzName: "", extraLaunchParameters: "" }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getSystemStatus: vi.fn().mockResolvedValue({
      steamFound: true,
      steamPath: "C:\\Steam\\steam.exe",
      steamPersonaName: "MonarchPlayer",
      dayzFound: true,
      dayzPath: "C:\\Steam\\steamapps\\common\\DayZ\\DayZ_x64.exe",
    }),
    getInstalledMods: vi.fn().mockResolvedValue([]),
    updateWorkshopMod: vi.fn().mockResolvedValue(undefined),
    unsubscribeWorkshopMod: vi.fn().mockResolvedValue(undefined),
    openModFolder: vi.fn().mockResolvedValue(undefined),
    checkForUpdate: vi.fn().mockResolvedValue({
      available: false,
      currentVersion: "0.4.0",
      latestVersion: null,
      notes: null,
    }),
    installUpdate: vi.fn().mockResolvedValue(undefined),
    prepareServerLaunch: vi
      .fn()
      .mockResolvedValueOnce({ ready: false, missingWorkshopIds: [], dayzRunning: true })
      .mockResolvedValue({ ready: true, missingWorkshopIds: [], dayzRunning: false }),
    setupServerMods: vi.fn().mockResolvedValue(undefined),
    getWorkshopDownloadProgress: vi.fn().mockResolvedValue([]),
    closeDayz: vi.fn().mockResolvedValue(undefined),
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

it("offers to close DayZ and resumes the requested join", async () => {
  const api = createApi();
  render(<AppShell api={api} />);

  expect(await screen.findByText("Monarch Daily Driver")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "JOIN" }));

  const dialog = await screen.findByRole("dialog", { name: "DayZ is already open" });
  expect(api.launchServer).not.toHaveBeenCalled();

  fireEvent.click(within(dialog).getByRole("button", { name: "CLOSE DAYZ & JOIN" }));

  await waitFor(() => expect(api.closeDayz).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(api.prepareServerLaunch).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(api.launchServer).toHaveBeenCalledWith(server));
  expect(screen.queryByRole("dialog", { name: "DayZ is already open" })).not.toBeInTheDocument();
});
