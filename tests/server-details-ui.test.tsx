import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { DayzServer } from "../lib/models";

const server: DayzServer = {
  id: "server-details-test",
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
  requiredWorkshopIds: ["1559212036", "1234567890"],
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
    getInstalledMods: vi.fn().mockResolvedValue([
      {
        workshopId: "1559212036",
        name: "Community Framework",
        path: "C:\\Steam\\steamapps\\workshop\\content\\221100\\1559212036",
        previewUrl: null,
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
    launchServer: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it("opens server details from the arrow next to JOIN and shows copyable IP plus required mods", async () => {
  render(<AppShell api={createApi()} />);
  await screen.findByText("Crashout DayZ");

  const details = screen.getByRole("button", { name: /view crashout dayz server info/i });
  fireEvent.click(details);

  const drawer = await screen.findByRole("dialog", { name: /crashout dayz server info/i });
  expect(drawer).toHaveTextContent("1.2.3.4:2302");
  expect(drawer).toHaveTextContent("1559212036");
  expect(drawer).toHaveTextContent("1234567890");
  expect(within(drawer).getByRole("button", { name: /copy server ip/i })).toBeInTheDocument();
  expect(within(drawer).getByRole("button", { name: /^join$/i })).toBeInTheDocument();
});

it("keeps mod cards compact and moves technical metadata into the details drawer", async () => {
  render(<AppShell api={createApi()} />);
  fireEvent.click(screen.getByRole("button", { name: "Mods" }));

  await waitFor(() => expect(screen.getByText("Community Framework")).toBeInTheDocument());
  expect(screen.queryByText("Workshop ID 1559212036")).not.toBeInTheDocument();
  expect(screen.queryByText("Folder location")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /view details for community framework/i }));
  const drawer = await screen.findByRole("dialog", { name: /community framework/i });
  expect(drawer).toHaveTextContent("1559212036");
  expect(drawer).toHaveTextContent(/steamapps\\workshop\\content\\221100\\1559212036/i);
});
