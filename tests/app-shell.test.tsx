import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { DayzServer } from "../lib/models";

const server: DayzServer = {
  id: "monarch-test",
  name: "Monarch Test Server",
  map: "chernarusplus",
  players: 42,
  capacity: 100,
  ping: 38,
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
    getServers: vi.fn().mockResolvedValue({
      servers: [server],
      isPartial: false,
      warning: null,
    }),
    getFavorites: vi.fn().mockResolvedValue([]),
    toggleFavorite: vi.fn().mockResolvedValue(true),
    getRecent: vi.fn().mockResolvedValue([]),
    clearRecent: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({
      dayzName: "",
      extraLaunchParameters: "",
    }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getSystemStatus: vi.fn().mockResolvedValue({
      steamFound: true,
      steamPath: "C:\\Program Files (x86)\\Steam\\steam.exe",
      dayzFound: true,
      dayzPath: "D:\\SteamLibrary\\steamapps\\common\\DayZ\\DayZ_x64.exe",
    }),
    getInstalledMods: vi.fn().mockResolvedValue([
      {
        workshopId: "1559212036",
        name: "Community Framework",
        path: "D:\\SteamLibrary\\steamapps\\workshop\\content\\221100\\1559212036",
      },
    ]),
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

it("starts on Servers with server-first navigation and real directory data", async () => {
  const api = createApi();
  render(<AppShell api={api} />);

  expect(screen.getByRole("heading", { name: "Servers" })).toBeInTheDocument();
  for (const item of ["Servers", "Favorites", "Recent", "Mods", "Settings"]) {
    expect(screen.getByRole("button", { name: item })).toBeInTheDocument();
  }
  expect(screen.queryByRole("button", { name: "Home" })).not.toBeInTheDocument();

  expect(await screen.findByText("Monarch Test Server")).toBeInTheDocument();
  expect(screen.getByText("42 / 100")).toBeInTheDocument();
});

it("shows a real server-directory error and retries", async () => {
  const api = createApi();
  api.getServers
    .mockRejectedValueOnce(new Error("directory offline"))
    .mockResolvedValueOnce({ servers: [server], isPartial: false, warning: null });

  render(<AppShell api={api} />);

  expect(await screen.findByText(/directory offline/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));

  await waitFor(() => expect(api.getServers).toHaveBeenCalledTimes(2));
  expect(await screen.findByText("Monarch Test Server")).toBeInTheDocument();
});

it("loads installed Workshop mods on the Mods page", async () => {
  const api = createApi();
  render(<AppShell api={api} />);

  fireEvent.click(screen.getByRole("button", { name: "Mods" }));

  expect(await screen.findByText("Community Framework")).toBeInTheDocument();
  expect(screen.getByText("1559212036")).toBeInTheDocument();
  expect(api.getInstalledMods).toHaveBeenCalledTimes(1);
});
