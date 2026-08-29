import { fireEvent, render, screen, within } from "@testing-library/react";
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
    getSettings: vi.fn().mockResolvedValue({ dayzName: "Monarch", dayzPath: "", extraLaunchParameters: "", skipBattleye: false, discordPresence: true }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getSystemStatus: vi.fn().mockResolvedValue({ steamFound: true, steamRunning: true, steamPath: "C:\\Steam\\steam.exe", steamPersonaName: "Monarch", dayzFound: true, dayzPath: "C:\\DayZ" }),
    getInstalledMods: vi.fn().mockResolvedValue([{ workshopId: "1559212036", name: "Community Framework", path: "C:\\Workshop\\1559212036", previewUrl: "https://cdn.example/cf.jpg", description: "This description must never render.", creator: "76561198000000001", fileSize: 1234, timeUpdated: 1787947200, needsUpdate: false, isDownloading: false, isSubscribed: true }]),
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

it("shows creator and Steam link but never renders the Workshop description", async () => {
  render(<AppShell api={createApi()} />);
  fireEvent.click(screen.getByRole("button", { name: "Mods" }));
  fireEvent.click(await screen.findByRole("button", { name: "Open Community Framework details" }));

  const dialog = await screen.findByRole("dialog", { name: "Mod Info" });
  expect(within(dialog).getByText(/76561198000000001/)).toBeInTheDocument();
  expect(within(dialog).getByRole("link", { name: /steam workshop/i })).toBeInTheDocument();
  expect(within(dialog).queryByText(/This description must never render/i)).not.toBeInTheDocument();
});
