import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { LauncherApi } from "../lib/api";
import type { DayzServer } from "../lib/models";

function generatedServer(index: number): DayzServer {
  return {
    id: `match-${index}`,
    name: `Crashout Match ${index}`,
    map: "chernarusplus",
    players: index % 60,
    capacity: 60,
    ping: null,
    ip: `10.1.${Math.floor(index / 255)}.${index % 255}`,
    gamePort: 2302 + (index % 20),
    queryPort: 2402 + (index % 20),
    status: "online",
    isPassworded: false,
    isOfficial: false,
    firstPersonOnly: false,
    country: "US",
    requiredWorkshopIds: [],
  };
}

function apiFor(servers: DayzServer[]): LauncherApi {
  return {
    getServers: vi.fn().mockResolvedValue({ servers, isPartial: false, warning: null }),
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
    pingServer: vi.fn().mockResolvedValue(42),
    closeDayz: vi.fn().mockResolvedValue(undefined),
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

it("shows every matching server and removes pagination while searching", async () => {
  const servers = Array.from({ length: 125 }, (_, index) => generatedServer(index + 1));
  render(<AppShell api={apiFor(servers)} />);

  expect(await screen.findByText("Crashout Match 1")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Search servers" }), {
    target: { value: "Crashout Match" },
  });

  await waitFor(() => expect(screen.getAllByRole("button", { name: "JOIN" })).toHaveLength(125));
  expect(screen.getByText("Crashout Match 125")).toBeInTheDocument();
  expect(screen.queryByLabelText("Server pages")).not.toBeInTheDocument();
});
