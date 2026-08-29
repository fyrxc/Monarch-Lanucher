import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AppShell } from "../components/app-shell";
import type { DayzServer } from "../lib/models";

const server: DayzServer = {
  id: "sound-test",
  name: "Sound Test Server",
  map: "chernarusplus",
  players: 12,
  capacity: 60,
  ping: 25,
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

it("plays one Monarch sound for clicks on controls owned by child components", async () => {
  const play = vi.fn().mockResolvedValue(undefined);
  const AudioMock = vi.fn(function AudioMock(this: {
    src: string;
    currentTime: number;
    volume: number;
    play: typeof play;
  }, src: string) {
    this.src = src;
    this.currentTime = 0;
    this.volume = 1;
    this.play = play;
  });
  vi.stubGlobal("Audio", AudioMock);

  render(<AppShell api={createApi()} />);
  await screen.findByText("Sound Test Server");

  fireEvent.click(screen.getByRole("checkbox", { name: /hide empty/i }));

  await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
  expect(AudioMock.mock.calls[0]?.[0]).toMatch(/^data:audio\/ogg;base64,/);
});

it("plays only one sound for controls that already have launcher actions", async () => {
  const play = vi.fn().mockResolvedValue(undefined);
  const AudioMock = vi.fn(function AudioMock(this: {
    currentTime: number;
    volume: number;
    play: typeof play;
  }) {
    this.currentTime = 0;
    this.volume = 1;
    this.play = play;
  });
  vi.stubGlobal("Audio", AudioMock);

  render(<AppShell api={createApi()} />);
  await screen.findByText("Sound Test Server");

  fireEvent.click(screen.getByRole("button", { name: "Favorites" }));

  await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
});
