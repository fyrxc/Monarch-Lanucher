import { render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { LauncherApi } from "../lib/api";
import type { DayzServer } from "../lib/models";

const server: DayzServer = {
  id: "ping-server",
  name: "Live Ping Server",
  map: "chernarusplus",
  players: 20,
  capacity: 100,
  ping: 999,
  ip: "127.0.0.1",
  gamePort: 2302,
  queryPort: 2303,
  status: "online",
  isPassworded: false,
  isOfficial: false,
  firstPersonOnly: false,
  country: "US",
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
    prepareServerLaunch: vi.fn().mockResolvedValue({
      ready: true,
      missingWorkshopIds: [],
      dayzRunning: false,
    }),
    setupServerMods: vi.fn().mockResolvedValue(undefined),
    getWorkshopDownloadProgress: vi.fn().mockResolvedValue([]),
    pingServer: vi.fn().mockResolvedValue(17),
    closeDayz: vi.fn().mockResolvedValue(undefined),
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

it("replaces directory ping with a live query result without reloading servers", async () => {
  const api = createApi();
  render(<AppShell api={api} />);

  expect(await screen.findByText("Live Ping Server")).toBeInTheDocument();
  await waitFor(() => expect(api.pingServer).toHaveBeenCalledWith(server));
  expect(await screen.findByText("17 ms")).toBeInTheDocument();
  expect(api.getServers).toHaveBeenCalledTimes(1);
});
