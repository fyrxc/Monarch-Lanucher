import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { DayzServer } from "../lib/models";

const server: DayzServer = {
  id: "missing-mod-server",
  name: "Crashout DayZ",
  map: "Melkart",
  players: 30,
  capacity: 60,
  ping: 41,
  ip: "1.2.3.4",
  gamePort: 2302,
  queryPort: 2303,
  status: "online",
  isPassworded: false,
  isOfficial: false,
  firstPersonOnly: false,
  country: "US",
  requiredWorkshopIds: ["1559212036"],
};

function createApi() {
  return {
    getServers: vi.fn().mockResolvedValue({ servers: [server], isPartial: false, warning: null }),
    getFavorites: vi.fn().mockResolvedValue([]),
    toggleFavorite: vi.fn().mockResolvedValue(true),
    getRecent: vi.fn().mockResolvedValue([]),
    clearRecent: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({ dayzName: "Player", extraLaunchParameters: "" }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getSystemStatus: vi.fn().mockResolvedValue({
      steamFound: true,
      steamPath: "C:\\Steam\\steam.exe",
      steamPersonaName: "Player",
      dayzFound: true,
      dayzPath: "C:\\Steam\\steamapps\\common\\DayZ\\DayZ_x64.exe",
    }),
    getInstalledMods: vi.fn().mockResolvedValue([]),
    getInstalledWorkshopIds: vi.fn().mockResolvedValue([]),
    installWorkshopMod: vi.fn().mockResolvedValue(undefined),
    getWorkshopDownloadStatus: vi.fn().mockResolvedValue({
      workshopId: "1559212036",
      isSubscribed: true,
      isDownloading: false,
      isInstalled: true,
      needsUpdate: false,
      downloadedBytes: 100,
      totalBytes: 100,
      percent: 100,
    }),
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
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

it("asks to install missing server mods and launches only after Steam reports them installed", async () => {
  const api = createApi();
  render(<AppShell api={api} />);

  await screen.findByText("Crashout DayZ");
  fireEvent.click(screen.getByRole("button", { name: "JOIN" }));

  const dialog = await screen.findByRole("dialog", { name: /required mods/i });
  expect(dialog).toHaveTextContent("1559212036");
  expect(api.launchServer).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: /install & join/i }));

  await waitFor(() => expect(api.installWorkshopMod).toHaveBeenCalledWith("1559212036"));
  await waitFor(() => expect(api.getWorkshopDownloadStatus).toHaveBeenCalledWith("1559212036"));
  await waitFor(() => expect(api.launchServer).toHaveBeenCalledWith(server));
});

it("joins immediately when every required Workshop ID is already installed", async () => {
  const api = createApi();
  api.getInstalledWorkshopIds.mockResolvedValue(["1559212036"]);
  render(<AppShell api={api} />);

  await screen.findByText("Crashout DayZ");
  fireEvent.click(screen.getByRole("button", { name: "JOIN" }));

  await waitFor(() => expect(api.launchServer).toHaveBeenCalledWith(server));
  expect(screen.queryByRole("dialog", { name: /required mods/i })).not.toBeInTheDocument();
});
