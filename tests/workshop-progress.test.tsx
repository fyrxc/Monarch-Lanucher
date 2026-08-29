import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { LauncherApi } from "../lib/api";
import type { DayzServer } from "../lib/models";

const server: DayzServer = {
  id: "progress-server",
  name: "Monarch Progress Server",
  map: "chernarusplus",
  players: 60,
  capacity: 100,
  ping: 25,
  ip: "10.0.0.30",
  gamePort: 2302,
  queryPort: 2303,
  status: "online",
  isPassworded: false,
  isOfficial: false,
  firstPersonOnly: false,
  country: "",
  requiredWorkshopIds: ["222"],
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
      .mockResolvedValueOnce({ ready: false, missingWorkshopIds: ["222"], dayzRunning: false })
      .mockResolvedValue({ ready: true, missingWorkshopIds: [], dayzRunning: false }),
    setupServerMods: vi.fn().mockResolvedValue(undefined),
    getWorkshopDownloadProgress: vi
      .fn()
      .mockResolvedValueOnce([
        {
          workshopId: "222",
          downloadedBytes: 50,
          totalBytes: 100,
          isDownloading: true,
          isInstalled: false,
          isSubscribed: true,
          needsUpdate: false,
        },
      ])
      .mockResolvedValue([
        {
          workshopId: "222",
          downloadedBytes: 100,
          totalBytes: 100,
          isDownloading: false,
          isInstalled: true,
          isSubscribed: true,
          needsUpdate: false,
        },
      ]),
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

it("shows live Steam progress and automatically becomes ready without auto-joining", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const api = createApi();
  render(<AppShell api={api} />);

  expect(await screen.findByText("Monarch Progress Server")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "JOIN" }));

  const dialog = await screen.findByRole("dialog", { name: "Setup Mods" });
  fireEvent.click(within(dialog).getByRole("button", { name: "SETUP MODS" }));

  await waitFor(() => expect(api.getWorkshopDownloadProgress).toHaveBeenCalledWith(["222"]));
  expect(within(dialog).getByText("50%")).toBeInTheDocument();
  expect(within(dialog).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");

  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });

  await waitFor(() => expect(api.getWorkshopDownloadProgress).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(api.prepareServerLaunch).toHaveBeenCalledTimes(2));
  expect(within(dialog).getByText("Ready — press Join again")).toBeInTheDocument();
  expect(api.launchServer).not.toHaveBeenCalled();
});
