import { render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ModsView } from "../components/mods-view";
import type { LauncherApi } from "../lib/api";
import type { InstalledMod } from "../lib/models";

const downloadingMod: InstalledMod = {
  workshopId: "111",
  name: "Downloading Pack",
  path: "C:\\Steam\\steamapps\\workshop\\content\\221100\\111",
  previewUrl: null,
  description: null,
  fileSize: 100,
  timeUpdated: null,
  needsUpdate: true,
  isDownloading: true,
  isSubscribed: true,
};

function api() {
  return {
    getInstalledMods: vi.fn().mockResolvedValue([
      downloadingMod,
      {
        ...downloadingMod,
        workshopId: "222",
        name: "Newly Downloaded Pack",
        isDownloading: false,
        needsUpdate: false,
      },
    ]),
    getWorkshopDownloadProgress: vi.fn().mockResolvedValue([
      {
        workshopId: "111",
        downloadedBytes: 50,
        totalBytes: 100,
        isDownloading: true,
        isInstalled: true,
        isSubscribed: true,
        needsUpdate: true,
      },
    ]),
    updateWorkshopMod: vi.fn().mockResolvedValue(undefined),
    unsubscribeWorkshopMod: vi.fn().mockResolvedValue(undefined),
    openModFolder: vi.fn().mockResolvedValue(undefined),
  } as unknown as LauncherApi;
}

function renderMods(client: LauncherApi, onChange = vi.fn()) {
  render(
    <ModsView
      api={client}
      loading={false}
      mods={[downloadingMod]}
      onChange={onChange}
      onError={vi.fn()}
      onMessage={vi.fn()}
      onRefresh={vi.fn()}
    />,
  );
  return onChange;
}

it("polls real Steam progress for a mod that was already downloading when Mods opened", async () => {
  const client = api();
  renderMods(client);

  await waitFor(() =>
    expect(client.getWorkshopDownloadProgress).toHaveBeenCalledWith(["111"]),
  );
  expect(await screen.findByText("Downloading 50%")).toBeInTheDocument();
  expect(screen.getByRole("status", { name: "Mod download status" })).toBeInTheDocument();
});

it("refreshes the installed-mod list from Steam while the Mods page remains open", async () => {
  const client = api();
  const onChange = renderMods(client);

  await waitFor(() => expect(client.getInstalledMods).toHaveBeenCalled());
  await waitFor(() =>
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ workshopId: "222" })]),
    ),
  );
});
