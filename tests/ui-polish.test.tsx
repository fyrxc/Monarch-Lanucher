import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { DayzServer } from "../lib/models";

const server: DayzServer = {
  id: "monarch-ui-test",
  name: "Monarch UI Test",
  map: "chernarusplus",
  players: 20,
  capacity: 100,
  ping: 32,
  ip: "127.0.0.1",
  gamePort: 2302,
  queryPort: 2303,
  status: "online",
  isPassworded: false,
  isOfficial: false,
  firstPersonOnly: false,
  country: "US",
  requiredWorkshopIds: [],
};

function apiWithMod(previewUrl: string | null = null) {
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
    getInstalledMods: vi.fn().mockResolvedValue([
      {
        workshopId: "1559212036",
        name: "Community Framework",
        path: "C:\\Steam\\steamapps\\workshop\\content\\221100\\1559212036",
        previewUrl,
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

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

it("marks the selected navigation tab as the current page", async () => {
  render(<AppShell api={apiWithMod()} />);

  const servers = screen.getByRole("button", { name: "Servers" });
  expect(servers).toHaveAttribute("aria-current", "page");

  fireEvent.click(screen.getByRole("button", { name: "Mods" }));
  expect(screen.getByRole("button", { name: "Mods" })).toHaveAttribute("aria-current", "page");
  expect(servers).not.toHaveAttribute("aria-current");
});

it("shows UI Sounds in Settings enabled by default and persists the toggle", async () => {
  const api = apiWithMod();
  const { unmount } = render(<AppShell api={api} />);

  fireEvent.click(screen.getByRole("button", { name: "Settings" }));

  const sounds = await screen.findByRole("checkbox", { name: /ui sounds/i });
  expect(sounds).toBeChecked();

  fireEvent.click(sounds);
  expect(sounds).not.toBeChecked();
  expect(localStorage.getItem("monarch.uiSoundsEnabled")).toBe("false");

  unmount();
  render(<AppShell api={apiWithMod()} />);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect(await screen.findByRole("checkbox", { name: /ui sounds/i })).not.toBeChecked();
});

it("keeps Check for Updates visible in Settings", async () => {
  render(<AppShell api={apiWithMod()} />);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));

  expect(await screen.findByRole("button", { name: /check for updates/i })).toBeInTheDocument();
});

it("opens the selected mod in a details panel with live mod data", async () => {
  render(<AppShell api={apiWithMod("https://cdn.example/cf.png")} />);
  fireEvent.click(screen.getByRole("button", { name: "Mods" }));

  const detailsButton = await screen.findByRole("button", {
    name: /view details for community framework/i,
  });
  fireEvent.click(detailsButton);

  const panel = await screen.findByRole("dialog", { name: /community framework/i });
  expect(panel).toHaveTextContent("1559212036");
  expect(panel).toHaveTextContent(/steamapps\\workshop\\content\\221100\\1559212036/i);
  expect(panel).toHaveTextContent(/update available/i);
  expect(panel).toHaveTextContent(/subscribed/i);
});

it("uses the Monarch logo when a Workshop mod has no preview image", async () => {
  render(<AppShell api={apiWithMod(null)} />);
  fireEvent.click(screen.getByRole("button", { name: "Mods" }));

  await waitFor(() => expect(screen.getByText("Community Framework")).toBeInTheDocument());
  expect(screen.getByTestId("monarch-mod-fallback")).toHaveAttribute("src");
  expect(screen.getByTestId("monarch-mod-fallback").getAttribute("src")).toMatch(/^data:image\/png;base64,/);
});
