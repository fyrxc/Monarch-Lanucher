import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { LauncherApi } from "../lib/api";
import type { DayzServer } from "../lib/models";

const server: DayzServer = {
  id: "figma-server",
  name: "Crashout DayZ",
  map: "Melkart",
  players: 30,
  capacity: 60,
  ping: 31,
  ip: "1.2.3.4",
  gamePort: 2302,
  queryPort: 2303,
  status: "online",
  isPassworded: false,
  isOfficial: false,
  firstPersonOnly: false,
  country: "US",
  requiredWorkshopIds: ["111"],
};

function createApi(): LauncherApi {
  return {
    getServers: vi.fn().mockResolvedValue({ servers: [server], isPartial: false, warning: null }),
    getFavorites: vi.fn().mockResolvedValue([]),
    toggleFavorite: vi.fn().mockResolvedValue(true),
    getRecent: vi.fn().mockResolvedValue([]),
    clearRecent: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({ dayzName: "Monarch", extraLaunchParameters: "", discordPresence: true }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getSystemStatus: vi.fn().mockResolvedValue({
      steamFound: true,
      steamPath: "C:\\Steam\\steam.exe",
      steamPersonaName: "Monarch",
      dayzFound: true,
      dayzPath: "C:\\Steam\\steamapps\\common\\DayZ",
    }),
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

it("uses the user's Monarch shell instead of the old generic page header", async () => {
  render(<AppShell api={createApi()} />);

  const brand = screen.getByLabelText("Monarch brand");
  expect(within(brand).getByRole("img", { name: "Monarch M" })).toBeInTheDocument();
  expect(within(brand).getByRole("img", { name: "onarch" })).toBeInTheDocument();

  expect(screen.queryByRole("heading", { name: "Servers" })).not.toBeInTheDocument();
  expect(screen.queryByText("Public DayZ servers load automatically.")).not.toBeInTheDocument();

  expect(await screen.findByText("Crashout DayZ")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Server filters" })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "DayZ servers" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
});
