import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { LauncherApi } from "../lib/api";
import type { DayzServer } from "../lib/models";

function makeServer(index: number): DayzServer {
  return {
    id: `server-${index}`,
    name: index === 0 ? "Crashout DayZ" : `Server ${index}`,
    map: "ChernarusPlus",
    players: 30,
    capacity: 60,
    ping: 31,
    ip: `10.0.0.${(index % 250) + 1}`,
    gamePort: 2302 + index,
    queryPort: 2402 + index,
    status: "online",
    isPassworded: false,
    isOfficial: false,
    firstPersonOnly: false,
    country: "US",
    requiredWorkshopIds: [],
  };
}

function createApi(servers: DayzServer[]): LauncherApi {
  return {
    getServers: vi.fn().mockResolvedValue({ servers, isPartial: false, warning: null }),
    getFavorites: vi.fn().mockResolvedValue([]),
    toggleFavorite: vi.fn().mockResolvedValue(true),
    getRecent: vi.fn().mockResolvedValue([]),
    clearRecent: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({ dayzName: "Monarch", dayzPath: "", extraLaunchParameters: "", skipBattleye: false, discordPresence: true }),
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

it("uses only the supplied SVG brand assets in the replacement shell", async () => {
  render(<AppShell api={createApi([makeServer(0)])} />);

  const brand = await screen.findByLabelText("Monarch brand");
  const mark = within(brand).getByRole("img", { name: "Monarch M" });
  const wordmark = within(brand).getByRole("img", { name: "onarch" });

  expect(mark).toHaveAttribute("src", "/branding/LogoWhite.svg");
  expect(wordmark).toHaveAttribute("src", "/branding/onarch.svg");
  expect(screen.queryByText("Public DayZ servers load automatically.")).not.toBeInTheDocument();
  expect(screen.queryByText(/Page \d+ of \d+/i)).not.toBeInTheDocument();
});

it("never paginates the server directory", async () => {
  const servers = Array.from({ length: 150 }, (_, index) => makeServer(index));
  render(<AppShell api={createApi(servers)} />);

  expect(await screen.findByText("Server 149")).toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "Server pages" })).not.toBeInTheDocument();
  expect(screen.queryByText(/Page \d+ of \d+/i)).not.toBeInTheDocument();
});
