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
    getSettings: vi.fn().mockResolvedValue({
      dayzName: "MonarchPlayer",
      dayzPath: "D:\\SteamLibrary\\steamapps\\common\\DayZ\\DayZ_x64.exe",
      extraLaunchParameters: "",
      skipBattleye: false,
      discordPresence: true,
    }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getSystemStatus: vi.fn().mockResolvedValue({
      steamFound: true,
      steamPath: "C:\\Steam\\steam.exe",
      steamPersonaName: "MonarchPlayer",
      dayzFound: true,
      dayzPath: "D:\\SteamLibrary\\steamapps\\common\\DayZ\\DayZ_x64.exe",
    }),
    getInstalledMods: vi.fn().mockResolvedValue([
      {
        workshopId: "111",
        name: "CUT Server Pack",
        path: "D:\\SteamLibrary\\steamapps\\workshop\\content\\221100\\111",
        previewUrl: null,
        needsUpdate: true,
        isDownloading: false,
        isSubscribed: true,
      },
    ]),
    updateWorkshopMod: vi.fn().mockResolvedValue(undefined),
    unsubscribeWorkshopMod: vi.fn().mockResolvedValue(undefined),
    openModFolder: vi.fn().mockResolvedValue(undefined),
    checkForUpdate: vi.fn().mockResolvedValue({ available: false, currentVersion: "0.4.0", latestVersion: null, notes: null }),
    installUpdate: vi.fn().mockResolvedValue(undefined),
    prepareServerLaunch: vi.fn().mockResolvedValue({ ready: true, missingWorkshopIds: [], dayzRunning: false }),
    setupServerMods: vi.fn().mockResolvedValue(undefined),
    getWorkshopDownloadProgress: vi.fn().mockResolvedValue([]),
    closeDayz: vi.fn().mockResolvedValue(undefined),
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

it("shows all approved settings and persists DayZ path, name, BattlEye and Discord Presence", async () => {
  const api = createApi();
  render(<AppShell api={api} />);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));

  const panel = await screen.findByRole("dialog", { name: "Settings" });
  expect(within(panel).getByLabelText("DayZ Path")).toHaveValue(
    "D:\\SteamLibrary\\steamapps\\common\\DayZ\\DayZ_x64.exe",
  );
  expect(within(panel).getByLabelText("Ingame Name")).toHaveValue("MonarchPlayer");
  expect(within(panel).getByLabelText("Skip BattlEye")).not.toBeChecked();
  expect(within(panel).getByLabelText("Discord Presence")).toBeChecked();
  expect(within(panel).getByRole("button", { name: "VERIFY MODS" })).toBeInTheDocument();
  expect(within(panel).getByRole("button", { name: "UNINSTALL ALL MODS" })).toBeInTheDocument();
  expect(within(panel).getByRole("button", { name: "REFRESH" })).toBeInTheDocument();

  fireEvent.change(within(panel).getByLabelText("Ingame Name"), { target: { value: "Crashout" } });
  fireEvent.click(within(panel).getByLabelText("Skip BattlEye"));
  fireEvent.click(within(panel).getByLabelText("Discord Presence"));
  fireEvent.click(within(panel).getByRole("button", { name: "SAVE SETTINGS" }));

  await waitFor(() =>
    expect(api.saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        dayzName: "Crashout",
        skipBattleye: true,
        discordPresence: false,
      }),
    ),
  );
});

it("verifies installed mods and requires confirmation before uninstalling all", async () => {
  const api = createApi();
  render(<AppShell api={api} />);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  const panel = await screen.findByRole("dialog", { name: "Settings" });

  fireEvent.click(within(panel).getByRole("button", { name: "VERIFY MODS" }));
  await waitFor(() => expect(api.getInstalledMods).toHaveBeenCalled());
  await waitFor(() => expect(api.updateWorkshopMod).toHaveBeenCalledWith("111"));

  fireEvent.click(within(panel).getByRole("button", { name: "UNINSTALL ALL MODS" }));
  const confirm = await screen.findByRole("dialog", { name: "Uninstall all mods" });
  expect(api.unsubscribeWorkshopMod).not.toHaveBeenCalled();
  fireEvent.click(within(confirm).getByRole("button", { name: "UNINSTALL ALL" }));
  await waitFor(() => expect(api.unsubscribeWorkshopMod).toHaveBeenCalledWith("111"));
});
