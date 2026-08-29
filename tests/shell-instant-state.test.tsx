import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { LauncherApi } from "../lib/api";
import type { DayzServer } from "../lib/models";
import { writeServerCache } from "../lib/server-cache";

const cachedServer: DayzServer = {
  id: "cached-server",
  name: "Cached Monarch Server",
  map: "chernarusplus",
  players: 24,
  capacity: 80,
  ping: 31,
  ip: "9.8.7.6",
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
    getServers: vi.fn().mockImplementation(() => new Promise(() => undefined)),
    getFavorites: vi.fn().mockResolvedValue([]),
    toggleFavorite: vi.fn().mockResolvedValue(true),
    getRecent: vi.fn().mockResolvedValue([]),
    clearRecent: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({
      dayzName: "",
      dayzPath: "",
      extraLaunchParameters: "",
      skipBattleye: false,
      discordPresence: true,
    }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getSystemStatus: vi.fn().mockResolvedValue({
      steamFound: true,
      steamPath: "C:\\Steam\\steam.exe",
      steamPersonaName: "MonarchPlayer",
      dayzFound: true,
      dayzPath: "D:\\SteamLibrary\\steamapps\\common\\DayZ\\DayZ_x64.exe",
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
    prepareServerLaunch: vi.fn().mockResolvedValue({ ready: true, missingWorkshopIds: [], dayzRunning: false }),
    setupServerMods: vi.fn().mockResolvedValue(undefined),
    getWorkshopDownloadProgress: vi.fn().mockResolvedValue([]),
    closeDayz: vi.fn().mockResolvedValue(undefined),
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

it("shows cached servers immediately while the live directory refresh is still pending", () => {
  writeServerCache([cachedServer]);
  render(<AppShell api={createApi()} />);

  expect(screen.getByText("Cached Monarch Server")).toBeInTheDocument();
  expect(screen.queryByText("Loading public DayZ servers...")).not.toBeInTheDocument();
});

it("preloads settings before the drawer opens so opening Settings does not trigger the first load", async () => {
  const api = createApi();
  render(<AppShell api={api} />);

  await waitFor(() => expect(api.getSettings).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(api.getSystemStatus).toHaveBeenCalledTimes(1));

  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect(await screen.findByRole("dialog", { name: "Settings" })).toBeInTheDocument();
  expect(api.getSettings).toHaveBeenCalledTimes(1);
  expect(api.getSystemStatus).toHaveBeenCalledTimes(1);
});
