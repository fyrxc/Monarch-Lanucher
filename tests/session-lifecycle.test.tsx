import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { LauncherApi } from "../lib/api";
import type { DayzServer } from "../lib/models";

const server: DayzServer = {
  id: "session-server",
  name: "Session Test Server",
  map: "chernarusplus",
  players: 20,
  capacity: 100,
  ping: 30,
  ip: "10.20.30.40",
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
    getDayzRunning: vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false),
    closeDayz: vi.fn().mockResolvedValue(undefined),
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

it("moves from Launching to Playing and clears the session after DayZ closes", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const api = createApi();
  render(<AppShell api={api} />);

  expect(await screen.findByText("Session Test Server")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "JOIN" }));

  await waitFor(() => expect(api.launchServer).toHaveBeenCalledWith(server));
  expect(await screen.findByText("Playing Session Test Server")).toBeInTheDocument();

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1700);
  });

  expect(await screen.findByText("Last played Session Test Server")).toBeInTheDocument();
  await waitFor(() => expect(api.getRecent).toHaveBeenCalled());
});
