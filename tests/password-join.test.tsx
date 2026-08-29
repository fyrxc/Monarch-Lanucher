import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { LauncherApi } from "../lib/api";
import type { DayzServer } from "../lib/models";

const lockedServer: DayzServer = {
  id: "locked-server",
  name: "Locked Monarch Server",
  map: "chernarusplus",
  players: 12,
  capacity: 100,
  ping: 31,
  ip: "1.2.3.4",
  gamePort: 2302,
  queryPort: 2303,
  status: "online",
  isPassworded: true,
  isOfficial: false,
  firstPersonOnly: false,
  country: "US",
  requiredWorkshopIds: [],
};

function createApi(): LauncherApi {
  return {
    getServers: vi.fn().mockResolvedValue({
      servers: [lockedServer],
      isPartial: false,
      warning: null,
    }),
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
    closeDayz: vi.fn().mockResolvedValue(undefined),
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

it("prompts for a password before launching a passworded server", async () => {
  const api = createApi();
  render(<AppShell api={api} />);

  expect(await screen.findByText("Locked Monarch Server")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "JOIN" }));

  const prompt = await screen.findByRole("dialog", { name: "Server password" });
  expect(prompt).toBeInTheDocument();
  expect(api.launchServer).not.toHaveBeenCalled();

  fireEvent.change(within(prompt).getByLabelText("Server password"), {
    target: { value: "letmein" },
  });
  fireEvent.click(within(prompt).getByRole("button", { name: "JOIN SERVER" }));

  await waitFor(() => expect(api.launchServer).toHaveBeenCalledWith(lockedServer, "letmein"));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Server password" })).not.toBeInTheDocument());
});
