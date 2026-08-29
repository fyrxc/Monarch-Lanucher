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
      steamPersonaName: "PublicSteamName",
      dayzFound: true,
      dayzPath: "D:\\SteamLibrary\\steamapps\\common\\DayZ\\DayZ_x64.exe",
    }),
    getInstalledMods: vi.fn().mockResolvedValue([
      {
        workshopId: "1559212036",
        name: "Community Framework",
        path: "D:\\SteamLibrary\\steamapps\\workshop\\content\\221100\\1559212036",
        previewUrl: "https://cdn.example/cf.jpg",
        needsUpdate: true,
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
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

function generatedServer(index: number): DayzServer {
  return {
    ...server,
    id: `server-${index}`,
    name: `Server ${index}`,
    ip: `10.0.${Math.floor(index / 255)}.${index % 255}`,
    gamePort: 2302 + (index % 20),
    queryPort: 2402 + (index % 20),
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

it("renders only 100 public servers at a time", async () => {
  const api = createApi();
  api.getServers.mockResolvedValue({
    servers: Array.from({ length: 205 }, (_, index) => generatedServer(index + 1)),
    isPartial: false,
    warning: null,
  });

  render(<AppShell api={api} />);

  expect(await screen.findByText("Server 1")).toBeInTheDocument();
  await waitFor(() => expect(screen.getAllByRole("button", { name: "JOIN" })).toHaveLength(100));
  expect(screen.getByText("Page 1 of 3 · 205 servers")).toBeInTheDocument();
  expect(screen.queryByText("Server 101")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Next" }));

  expect(await screen.findByText("Server 101")).toBeInTheDocument();
  expect(screen.getByText("Page 2 of 3 · 205 servers")).toBeInTheDocument();
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

it("keeps Workshop metadata in the details drawer and exposes compact mod actions", async () => {
  const api = createApi();
  const { container } = render(<AppShell api={api} />);

  fireEvent.click(screen.getByRole("button", { name: "Mods" }));

  expect(await screen.findByText("Community Framework")).toBeInTheDocument();
  expect(container.querySelector('img[src="https://cdn.example/cf.jpg"]')).toBeInTheDocument();
  expect(screen.queryByText("Workshop ID 1559212036")).not.toBeInTheDocument();
  expect(screen.queryByText(/steamapps\\workshop\\content\\221100\\1559212036/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /view details for community framework/i }));
  const drawer = await screen.findByRole("dialog", { name: /community framework/i });
  expect(drawer).toHaveTextContent("1559212036");
  expect(drawer).toHaveTextContent(/steamapps\\workshop\\content\\221100\\1559212036/i);
  fireEvent.click(screen.getByRole("button", { name: /close mod details/i }));

  fireEvent.click(screen.getByRole("button", { name: /open community framework files/i }));
  await waitFor(() => expect(api.openModFolder).toHaveBeenCalledWith("1559212036"));

  fireEvent.click(screen.getByRole("button", { name: /check community framework for update/i }));
  await waitFor(() => expect(api.updateWorkshopMod).toHaveBeenCalledWith("1559212036"));

  fireEvent.click(screen.getByRole("button", { name: /uninstall community framework/i }));
  await waitFor(() => expect(api.unsubscribeWorkshopMod).toHaveBeenCalledWith("1559212036"));
  await waitFor(() => expect(screen.queryByText("Community Framework")).not.toBeInTheDocument());
});

it("defaults a blank DayZ name to the active Steam public name", async () => {
  const api = createApi();
  render(<AppShell api={api} />);

  fireEvent.click(screen.getByRole("button", { name: "Settings" }));

  const playerName = await screen.findByDisplayValue("PublicSteamName");
  expect(playerName).toBeInTheDocument();
  expect(screen.getByText("PublicSteamName")).toBeInTheDocument();
});

it("keeps a saved DayZ name instead of replacing it with Steam", async () => {
  const api = createApi();
  api.getSettings.mockResolvedValue({
    dayzName: "CustomDayZName",
    extraLaunchParameters: "",
  });
  render(<AppShell api={api} />);

  fireEvent.click(screen.getByRole("button", { name: "Settings" }));

  expect(await screen.findByDisplayValue("CustomDayZName")).toBeInTheDocument();
  expect(screen.queryByDisplayValue("PublicSteamName")).not.toBeInTheDocument();
});
