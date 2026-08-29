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
      currentVersion: "0.4.1",
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
    getServerModDetails: vi.fn().mockResolvedValue([
      {
        workshopId: "111",
        name: "Community Framework",
        isInstalled: true,
        isDownloading: false,
        needsUpdate: false,
      },
      {
        workshopId: "222",
        name: "Monarch Server Pack",
        isInstalled: false,
        isDownloading: false,
        needsUpdate: false,
      },
    ]),
    closeDayz: vi.fn().mockResolvedValue(undefined),
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

it("opens server info, copies the address, shows server summary and required mod status, and joins", async () => {
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
  expect(within(panel).getByText("Query port 2303")).toBeInTheDocument();
  expect(within(panel).getByText("namalsk")).toBeInTheDocument();
  expect(within(panel).getAllByText("45 / 60")).toHaveLength(2);
  expect(within(panel).getAllByText("28 ms")).toHaveLength(2);
  expect(within(panel).getByText("US")).toBeInTheDocument();
  expect(within(panel).getByText("Community")).toBeInTheDocument();
  expect(await within(panel).findByText("Community Framework")).toBeInTheDocument();
  expect(within(panel).getByText("Monarch Server Pack")).toBeInTheDocument();
  expect(within(panel).getByText("Installed")).toBeInTheDocument();
  expect(within(panel).getByText("Missing")).toBeInTheDocument();
  expect(api.getServerModDetails).toHaveBeenCalledWith(["111", "222"]);

  fireEvent.click(within(panel).getByRole("button", { name: "Copy server address" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("10.0.0.10:2302"));

  fireEvent.click(within(panel).getByRole("button", { name: "JOIN SERVER" }));
  await waitFor(() => expect(api.launchServer).toHaveBeenCalledWith(server));
});
