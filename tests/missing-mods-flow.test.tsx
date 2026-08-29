import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { LauncherApi } from "../lib/api";
import type { DayzServer, ServerLaunchPreflight } from "../lib/models";

const server: DayzServer = {
  id: "modded-server",
  name: "Monarch Modded Server",
  map: "chernarusplus",
  players: 50,
  capacity: 100,
  ping: 34,
  ip: "10.0.0.20",
  gamePort: 2302,
  queryPort: 2303,
  status: "online",
  isPassworded: false,
  isOfficial: false,
  firstPersonOnly: false,
  country: "",
  requiredWorkshopIds: ["111", "222"],
};

const missing: ServerLaunchPreflight = {
  ready: false,
  missingWorkshopIds: ["222"],
  dayzRunning: false,
};

const ready: ServerLaunchPreflight = {
  ready: true,
  missingWorkshopIds: [],
  dayzRunning: false,
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
    prepareServerLaunch: vi.fn().mockResolvedValueOnce(missing).mockResolvedValue(ready),
    setupServerMods: vi.fn().mockResolvedValue(undefined),
    getWorkshopDownloadProgress: vi.fn().mockResolvedValue([]),
    closeDayz: vi.fn().mockResolvedValue(undefined),
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

it("sets up missing server mods and requires Join again after Steam is ready", async () => {
  const api = createApi();
  render(<AppShell api={api} />);

  expect(await screen.findByText("Monarch Modded Server")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "JOIN" }));

  const setup = await screen.findByRole("dialog", { name: "Setup Mods" });
  expect(within(setup).getByText(/1 required mod/i)).toBeInTheDocument();
  expect(api.launchServer).not.toHaveBeenCalled();

  fireEvent.click(within(setup).getByRole("button", { name: "SETUP MODS" }));
  await waitFor(() => expect(api.setupServerMods).toHaveBeenCalledWith(["222"]));

  fireEvent.click(within(setup).getByRole("button", { name: "CHECK STATUS" }));
  await waitFor(() => expect(api.prepareServerLaunch).toHaveBeenCalledTimes(2));
  expect(within(setup).getByText("Ready — press Join again")).toBeInTheDocument();
  expect(api.launchServer).not.toHaveBeenCalled();

  fireEvent.click(within(setup).getByRole("button", { name: "CLOSE" }));
  fireEvent.click(screen.getByRole("button", { name: "JOIN" }));

  await waitFor(() => expect(api.launchServer).toHaveBeenCalledWith(server));
});
