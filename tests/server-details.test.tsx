import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { LauncherApi } from "../lib/api";
import type { DayzServer } from "../lib/models";

const server: DayzServer = {
  id: "detail-server",
  name: "Monarch Detail Server",
  map: "namalsk",
  players: 45,
  capacity: 60,
  ping: 28,
  ip: "10.0.0.10",
  gamePort: 2302,
  queryPort: 2303,
  status: "online",
  isPassworded: false,
  isOfficial: false,
  firstPersonOnly: true,
  country: "US",
  requiredWorkshopIds: ["111", "222"],
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
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

it("opens server info, copies the address, shows required mods, and joins from the panel", async () => {
  const api = createApi();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });

  render(<AppShell api={api} />);
  expect(await screen.findByText("Monarch Detail Server")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "View details for Monarch Detail Server" }));

  const panel = await screen.findByRole("dialog", { name: "Server Info" });
  expect(within(panel).getByText("Monarch Detail Server")).toBeInTheDocument();
  expect(within(panel).getByText("10.0.0.10:2302")).toBeInTheDocument();
  expect(within(panel).getByText("namalsk")).toBeInTheDocument();
  expect(within(panel).getByText("45 / 60")).toBeInTheDocument();
  expect(within(panel).getByText("28 ms")).toBeInTheDocument();
  expect(within(panel).getByText("Workshop 111")).toBeInTheDocument();
  expect(within(panel).getByText("Workshop 222")).toBeInTheDocument();

  fireEvent.click(within(panel).getByRole("button", { name: "Copy server address" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("10.0.0.10:2302"));

  fireEvent.click(within(panel).getByRole("button", { name: "JOIN SERVER" }));
  await waitFor(() => expect(api.launchServer).toHaveBeenCalledWith(server));
});
