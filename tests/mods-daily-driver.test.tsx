import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { LauncherApi } from "../lib/api";

function createApi(): LauncherApi {
  return {
    getServers: vi.fn().mockResolvedValue({ servers: [], isPartial: false, warning: null }),
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
    getInstalledMods: vi.fn().mockResolvedValue([
      {
        workshopId: "111",
        name: "CUT Server Pack",
        path: "C:\\Steam\\steamapps\\workshop\\content\\221100\\111",
        previewUrl: "https://cdn.example/cut.jpg",
        description: "Crashout server content.",
        fileSize: 1073741824,
        timeUpdated: 1787947200,
        needsUpdate: true,
        isDownloading: false,
        isSubscribed: true,
      },
      {
        workshopId: "222",
        name: "No Image Mod",
        path: "C:\\Steam\\steamapps\\workshop\\content\\221100\\222",
        previewUrl: null,
        description: null,
        fileSize: null,
        timeUpdated: null,
        needsUpdate: false,
        isDownloading: false,
        isSubscribed: true,
      },
    ]),
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
    prepareServerLaunch: vi.fn().mockResolvedValue({ ready: true, missingWorkshopIds: [], dayzRunning: false }),
    setupServerMods: vi.fn().mockResolvedValue(undefined),
    getWorkshopDownloadProgress: vi.fn().mockResolvedValue([
      {
        workshopId: "111",
        downloadedBytes: 25,
        totalBytes: 100,
        isDownloading: true,
        isInstalled: true,
        isSubscribed: true,
        needsUpdate: true,
      },
    ]),
    closeDayz: vi.fn().mockResolvedValue(undefined),
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

it("searches installed mods, opens rich Mod Info, updates in place, and confirms uninstall", async () => {
  const api = createApi();
  render(<AppShell api={api} />);

  fireEvent.click(screen.getByRole("button", { name: "Mods" }));
  expect(await screen.findByText("CUT Server Pack")).toBeInTheDocument();
  expect(screen.getByText("No Image Mod")).toBeInTheDocument();

  const search = screen.getByRole("searchbox", { name: "Search installed mods" });
  fireEvent.change(search, { target: { value: "CUT" } });
  expect(screen.getByText("CUT Server Pack")).toBeInTheDocument();
  expect(screen.queryByText("No Image Mod")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Open CUT Server Pack details" }));
  const info = await screen.findByRole("dialog", { name: "Mod Info" });
  expect(within(info).getByText("Crashout server content.")).toBeInTheDocument();
  expect(within(info).getByText("Workshop ID 111")).toBeInTheDocument();
  expect(within(info).getByText("1.00 GB")).toBeInTheDocument();
  expect(within(info).getByRole("link", { name: "Steam Workshop" })).toHaveAttribute(
    "href",
    "https://steamcommunity.com/sharedfiles/filedetails/?id=111",
  );

  fireEvent.click(within(info).getByRole("button", { name: "Update mod" }));
  await waitFor(() => expect(api.updateWorkshopMod).toHaveBeenCalledWith("111"));
  expect(screen.getByRole("button", { name: "Open CUT Server Pack details" })).toBeInTheDocument();
  await waitFor(() => expect(within(info).getByText(/Updating/)).toBeInTheDocument());

  fireEvent.click(within(info).getByRole("button", { name: "Uninstall mod" }));
  const confirm = await screen.findByRole("dialog", { name: "Uninstall mod" });
  expect(within(confirm).getByText(/CUT Server Pack/)).toBeInTheDocument();
  expect(api.unsubscribeWorkshopMod).not.toHaveBeenCalled();
  fireEvent.click(within(confirm).getByRole("button", { name: "UNINSTALL" }));
  await waitFor(() => expect(api.unsubscribeWorkshopMod).toHaveBeenCalledWith("111"));
});
