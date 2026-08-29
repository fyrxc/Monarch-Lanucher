"use client";

import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FaTrashCan } from "react-icons/fa6";
import { FiCopy } from "react-icons/fi";
import { HiOutlineSpeakerWave } from "react-icons/hi2";
import { IoClose } from "react-icons/io5";
import { RxUpdate } from "react-icons/rx";
import { VscFiles } from "react-icons/vsc";
import type { LauncherApi } from "../lib/api";
import { tauriApi } from "../lib/api";
import { filterServers, type ServerFilters } from "../lib/filters";
import type {
  DayzServer,
  InstalledMod,
  LauncherSettings,
  SystemStatus,
  WorkshopDownloadStatus,
} from "../lib/models";
import { paginate } from "../lib/pagination";
import { serverIdentity } from "../lib/server-id";
import { MONARCH_LOGO_DATA_URI, UI_CLICK_SOUND_DATA_URI } from "../lib/ui-assets";
import { ModCard } from "./mod-card";
import { Navigation, type LauncherView } from "./navigation";
import { ServerFiltersPanel } from "./server-filters";
import { ServerTable } from "./server-table";
import { StatusBanner } from "./status-banner";
import { UpdatePanel } from "./update-panel";

const SERVER_PAGE_SIZE = 100;
const UI_SOUND_KEY = "monarch.uiSoundsEnabled";
const WORKSHOP_POLL_MS = 750;
const WORKSHOP_INSTALL_TIMEOUT_MS = 30 * 60 * 1000;
type ModAction = "update" | "uninstall" | "folder";

const emptyFilters: ServerFilters = {
  search: "",
  map: "",
  minPlayers: null,
  maxPlayers: null,
  maxPing: null,
  hideEmpty: false,
  hideFull: false,
  modded: null,
  passworded: null,
  official: null,
  firstPersonOnly: null,
  favoritesOnly: false,
};

const emptySettings: LauncherSettings = { dayzName: "", extraLaunchParameters: "" };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function modStateLabel(mod: InstalledMod): string {
  if (mod.isDownloading) return "Downloading";
  if (mod.needsUpdate) return "Update available";
  if (!mod.isSubscribed) return "Installed locally";
  return "Installed";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "--";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

export function AppShell({ api = tauriApi }: { api?: LauncherApi }) {
  const [activeView, setActiveView] = useState<LauncherView>("Servers");
  const [servers, setServers] = useState<DayzServer[]>([]);
  const [favorites, setFavorites] = useState<DayzServer[]>([]);
  const [recent, setRecent] = useState<DayzServer[]>([]);
  const [installedMods, setInstalledMods] = useState<InstalledMod[]>([]);
  const [selectedMod, setSelectedMod] = useState<InstalledMod | null>(null);
  const [selectedServer, setSelectedServer] = useState<DayzServer | null>(null);
  const [pendingJoin, setPendingJoin] = useState<DayzServer | null>(null);
  const [missingWorkshopIds, setMissingWorkshopIds] = useState<string[]>([]);
  const [workshopProgress, setWorkshopProgress] = useState<
    Record<string, WorkshopDownloadStatus>
  >({});
  const [installingRequiredMods, setInstallingRequiredMods] = useState(false);
  const [filters, setFilters] = useState<ServerFilters>(emptyFilters);
  const [serverPage, setServerPage] = useState(1);
  const [settings, setSettings] = useState<LauncherSettings>(emptySettings);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [uiSoundsEnabled, setUiSoundsEnabled] = useState(true);
  const [loadingServers, setLoadingServers] = useState(true);
  const [loadingMods, setLoadingMods] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [modBusy, setModBusy] = useState<{ id: string; action: ModAction } | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const deferredFilters = useDeferredValue(filters);

  useEffect(() => {
    const stored = window.localStorage.getItem(UI_SOUND_KEY);
    if (stored !== null) setUiSoundsEnabled(stored !== "false");
  }, []);

  const playUiSound = useCallback(() => {
    if (!uiSoundsEnabled) return;
    try {
      const audio = new Audio(UI_CLICK_SOUND_DATA_URI);
      audio.volume = 0.42;
      audio.currentTime = 0;
      void audio.play()?.catch(() => undefined);
    } catch {
      // Sound must never block a launcher action.
    }
  }, [uiSoundsEnabled]);

  const handleInteractiveClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest(
        "button, a, input, select, textarea, [role='button'], [data-ui-click]",
      );
      if (!control) return;
      if (control.hasAttribute("disabled") || control.getAttribute("aria-disabled") === "true") {
        return;
      }
      playUiSound();
    },
    [playUiSound],
  );

  const loadServers = useCallback(async () => {
    setLoadingServers(true);
    setServerError(null);
    try {
      const result = await api.getServers();
      setServers(result.servers);
      setWarning(result.warning);
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setLoadingServers(false);
    }
  }, [api]);

  const loadFavorites = useCallback(async () => {
    try {
      setFavorites(await api.getFavorites());
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }, [api]);

  const loadRecent = useCallback(async () => {
    try {
      setRecent(await api.getRecent());
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }, [api]);

  const loadInstalledMods = useCallback(async () => {
    setLoadingMods(true);
    setActionError(null);
    try {
      const nextMods = await api.getInstalledMods();
      setInstalledMods(nextMods);
      setSelectedMod((current) =>
        current ? nextMods.find((item) => item.workshopId === current.workshopId) ?? null : null,
      );
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setLoadingMods(false);
    }
  }, [api]);

  useEffect(() => {
    void loadServers();
    void loadFavorites();
  }, [loadFavorites, loadServers]);

  useEffect(() => {
    if (activeView === "Recent") void loadRecent();
    if (activeView === "Mods") void loadInstalledMods();
    if (activeView === "Settings") {
      void Promise.all([api.getSettings(), api.getSystemStatus()])
        .then(([nextSettings, status]) => {
          const steamDefault = status.steamPersonaName?.trim() ?? "";
          setSettings(
            nextSettings.dayzName.trim() || !steamDefault
              ? nextSettings
              : { ...nextSettings, dayzName: steamDefault },
          );
          setSystemStatus(status);
        })
        .catch((error) => setActionError(errorMessage(error)));
    }
  }, [activeView, api, loadInstalledMods, loadRecent]);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((server) => serverIdentity(server))),
    [favorites],
  );
  const installedModById = useMemo(
    () => new Map(installedMods.map((mod) => [mod.workshopId, mod])),
    [installedMods],
  );
  const maps = useMemo(
    () =>
      Array.from(new Set(servers.map((server) => server.map).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [servers],
  );
  const visibleServers = useMemo(
    () => filterServers(servers, deferredFilters, favoriteIds),
    [deferredFilters, favoriteIds, servers],
  );
  const serverPageResult = useMemo(
    () => paginate(visibleServers, serverPage, SERVER_PAGE_SIZE),
    [serverPage, visibleServers],
  );

  const selectView = useCallback((view: LauncherView) => {
    setSelectedMod(null);
    setSelectedServer(null);
    setActiveView(view);
  }, []);

  const openServerDetails = useCallback(
    (server: DayzServer) => {
      setSelectedServer(server);
      void api.getInstalledMods().then(setInstalledMods).catch(() => undefined);
    },
    [api],
  );

  const toggleFavorite = useCallback(
    async (server: DayzServer) => {
      try {
        await api.toggleFavorite(server);
        await loadFavorites();
      } catch (error) {
        setActionError(errorMessage(error));
      }
    },
    [api, loadFavorites],
  );

  const launchServerNow = useCallback(
    async (server: DayzServer) => {
      setJoiningId(serverIdentity(server));
      setActionMessage(null);
      setActionError(null);
      try {
        await api.launchServer(server);
        setActionMessage(`Launching ${server.name}`);
        await loadRecent();
      } catch (error) {
        setActionError(errorMessage(error));
      } finally {
        setJoiningId(null);
      }
    },
    [api, loadRecent],
  );

  const joinServer = useCallback(
    async (server: DayzServer) => {
      setActionMessage(null);
      setActionError(null);

      if (server.requiredWorkshopIds.length > 0) {
        try {
          const installedIds = api.getInstalledWorkshopIds
            ? await api.getInstalledWorkshopIds()
            : (await api.getInstalledMods()).map((mod) => mod.workshopId);
          const installed = new Set(installedIds);
          const missing = server.requiredWorkshopIds.filter((id) => !installed.has(id));

          if (missing.length > 0) {
            setSelectedServer(null);
            setPendingJoin(server);
            setMissingWorkshopIds(missing);
            setWorkshopProgress({});
            return;
          }
        } catch (error) {
          setActionError(errorMessage(error));
          return;
        }
      }

      await launchServerNow(server);
    },
    [api, launchServerNow],
  );

  const installRequiredModsAndJoin = useCallback(async () => {
    if (!pendingJoin || missingWorkshopIds.length === 0) return;
    if (!api.installWorkshopMod || !api.getWorkshopDownloadStatus) {
      setActionError("Workshop installation is unavailable in this build.");
      return;
    }

    setInstallingRequiredMods(true);
    setActionError(null);

    try {
      for (const workshopId of missingWorkshopIds) {
        await api.installWorkshopMod(workshopId);
        const deadline = Date.now() + WORKSHOP_INSTALL_TIMEOUT_MS;

        while (true) {
          const status = await api.getWorkshopDownloadStatus(workshopId);
          setWorkshopProgress((current) => ({ ...current, [workshopId]: status }));

          if (status.isInstalled && !status.needsUpdate && !status.isDownloading) {
            break;
          }
          if (Date.now() >= deadline) {
            throw new Error(`Steam timed out while downloading Workshop mod ${workshopId}.`);
          }
          await wait(WORKSHOP_POLL_MS);
        }
      }

      const server = pendingJoin;
      setPendingJoin(null);
      setMissingWorkshopIds([]);
      setWorkshopProgress({});
      await launchServerNow(server);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setInstallingRequiredMods(false);
    }
  }, [api, launchServerNow, missingWorkshopIds, pendingJoin]);

  const copyServerAddress = useCallback(async (server: DayzServer) => {
    const address = `${server.ip}:${server.gamePort}`;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard is unavailable");
      await navigator.clipboard.writeText(address);
      setActionMessage(`Copied ${address}`);
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }, []);

  const openModFolder = useCallback(
    async (mod: InstalledMod) => {
      setModBusy({ id: mod.workshopId, action: "folder" });
      try {
        await api.openModFolder(mod.workshopId);
      } catch (error) {
        setActionError(errorMessage(error));
      } finally {
        setModBusy(null);
      }
    },
    [api],
  );

  const updateMod = useCallback(
    async (mod: InstalledMod) => {
      setModBusy({ id: mod.workshopId, action: "update" });
      setActionMessage(null);
      setActionError(null);
      try {
        await api.updateWorkshopMod(mod.workshopId);
        setActionMessage(`Steam is checking/downloading the latest ${mod.name} update.`);
      } catch (error) {
        setActionError(errorMessage(error));
      } finally {
        setModBusy(null);
      }
    },
    [api],
  );

  const uninstallMod = useCallback(
    async (mod: InstalledMod) => {
      setModBusy({ id: mod.workshopId, action: "uninstall" });
      setActionError(null);
      try {
        await api.unsubscribeWorkshopMod(mod.workshopId);
        setInstalledMods((current) =>
          current.filter((item) => item.workshopId !== mod.workshopId),
        );
        setSelectedMod((current) => (current?.workshopId === mod.workshopId ? null : current));
        setActionMessage(`Unsubscribed ${mod.name} through Steam.`);
      } catch (error) {
        setActionError(errorMessage(error));
      } finally {
        setModBusy(null);
      }
    },
    [api],
  );

  async function clearRecent() {
    try {
      await api.clearRecent();
      setRecent([]);
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      await api.saveSettings(settings);
      setActionMessage("Settings saved.");
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setSavingSettings(false);
    }
  }

  function toggleUiSounds() {
    const next = !uiSoundsEnabled;
    setUiSoundsEnabled(next);
    window.localStorage.setItem(UI_SOUND_KEY, String(next));
  }

  function renderServers() {
    return (
      <div className="view-content view-enter figma-server-view">
        <div className="view-toolbar figma-server-toolbar">
          <div>
            <h1>Servers</h1>
            <p>Public DayZ servers load automatically.</p>
          </div>
          <button className="ghost-button icon-button" onClick={() => void loadServers()} type="button">
            <RxUpdate aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
        {warning ? <StatusBanner tone="warning">{warning}</StatusBanner> : null}
        {serverError ? (
          <StatusBanner
            action={
              <button className="banner-button" onClick={() => void loadServers()} type="button">
                Retry
              </button>
            }
            tone="error"
          >
            {serverError}
          </StatusBanner>
        ) : null}
        {loadingServers ? (
          <div className="loading-state">Loading public DayZ servers...</div>
        ) : serverError ? null : (
          <>
            <ServerFiltersPanel
              filters={filters}
              maps={maps}
              onChange={(next) => {
                setFilters(next);
                setServerPage(1);
              }}
              onClear={() => {
                setFilters(emptyFilters);
                setServerPage(1);
              }}
              resultCount={visibleServers.length}
            />
            <ServerTable
              favoriteIds={favoriteIds}
              joiningId={joiningId}
              onDetails={openServerDetails}
              onFavorite={toggleFavorite}
              onJoin={joinServer}
              servers={serverPageResult.items}
            />
            {visibleServers.length > 0 ? (
              <div className="server-pagination" aria-label="Server pages">
                <button
                  className="ghost-button"
                  disabled={serverPageResult.page <= 1}
                  onClick={() => setServerPage(serverPageResult.page - 1)}
                  type="button"
                >
                  Previous
                </button>
                <span>
                  Page {serverPageResult.page} of {serverPageResult.pageCount} ·{" "}
                  {serverPageResult.total.toLocaleString()} servers
                </span>
                <button
                  className="ghost-button"
                  disabled={serverPageResult.page >= serverPageResult.pageCount}
                  onClick={() => setServerPage(serverPageResult.page + 1)}
                  type="button"
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  }

  function renderCollection(title: "Favorites" | "Recent", collection: DayzServer[]) {
    return (
      <div className="view-content view-enter">
        <div className="view-toolbar">
          <div>
            <h1>{title}</h1>
            <p>{title === "Favorites" ? "Servers you saved." : "Your latest successful joins."}</p>
          </div>
          {title === "Recent" && collection.length > 0 ? (
            <button className="ghost-button" onClick={() => void clearRecent()} type="button">
              Clear Recent
            </button>
          ) : null}
        </div>
        <ServerTable
          favoriteIds={favoriteIds}
          joiningId={joiningId}
          onDetails={openServerDetails}
          onFavorite={toggleFavorite}
          onJoin={joinServer}
          servers={collection}
        />
      </div>
    );
  }

  function renderMods() {
    return (
      <div className="view-content view-enter mods-view figma-mods-view">
        <div className="view-toolbar figma-mods-toolbar">
          <div>
            <h1>Mods</h1>
            <p>Steam Workshop mods installed for DayZ.</p>
          </div>
          <button
            className="ghost-button icon-button"
            disabled={loadingMods}
            onClick={() => void loadInstalledMods()}
            type="button"
          >
            <RxUpdate aria-hidden="true" />
            <span>{loadingMods ? "Scanning..." : "Refresh"}</span>
          </button>
        </div>
        {loadingMods ? (
          <div className="loading-state">Loading Steam Workshop mods...</div>
        ) : installedMods.length === 0 ? (
          <div className="empty-state">No installed DayZ Workshop mods were detected.</div>
        ) : (
          <div className="mods-scroll-shell">
            <div className="mods-list" aria-label="Installed DayZ Workshop mods">
              {installedMods.map((mod) => (
                <ModCard
                  busyAction={modBusy?.id === mod.workshopId ? modBusy.action : null}
                  key={mod.workshopId}
                  mod={mod}
                  onOpenFolder={(item) => void openModFolder(item)}
                  onSelect={setSelectedMod}
                  onUninstall={(item) => void uninstallMod(item)}
                  onUpdate={(item) => void updateMod(item)}
                />
              ))}
            </div>
            <div className="mods-scroll-hint" aria-hidden="true" />
          </div>
        )}
      </div>
    );
  }

  function renderSettingsDrawer() {
    if (activeView !== "Settings") return null;
    return (
      <div
        className="drawer-scrim settings-scrim"
        data-ui-click
        onMouseDown={() => setActiveView("Servers")}
      >
        <aside
          aria-label="Settings"
          aria-modal="true"
          className="settings-drawer"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <button
            aria-label="Close settings"
            className="drawer-close settings-back"
            onClick={() => setActiveView("Servers")}
            type="button"
          >
            <IoClose aria-hidden="true" />
          </button>
          <div className="settings-wordmark" data-testid="monarch-wordmark">
            <img alt="Monarch M" src={MONARCH_LOGO_DATA_URI} />
            <span>onarch</span>
          </div>
          <label className="settings-label">
            <span>DayZ Path</span>
            <input
              className="field"
              readOnly
              value={systemStatus?.dayzPath ?? "Detecting DayZ..."}
            />
          </label>
          <label className="settings-label">
            <span>Ingame Name</span>
            <input
              className="field"
              onChange={(event) => setSettings({ ...settings, dayzName: event.target.value })}
              value={settings.dayzName}
            />
          </label>
          <label className="settings-toggle-row figma-settings-toggle">
            <div className="settings-toggle-copy">
              <span className="settings-toggle-icon" aria-hidden="true">
                <HiOutlineSpeakerWave />
              </span>
              <span>
                <strong>UI Sounds</strong>
                <small>Play the Monarch click sound on launcher controls.</small>
              </span>
            </div>
            <input
              aria-label="UI Sounds"
              checked={uiSoundsEnabled}
              onChange={toggleUiSounds}
              type="checkbox"
            />
          </label>
          <div className="settings-system-summary">
            <span>Steam</span>
            <strong>{systemStatus?.steamPersonaName ?? "Detecting..."}</strong>
          </div>
          <button
            className="settings-wide-button"
            disabled={savingSettings}
            onClick={() => void saveSettings()}
            type="button"
          >
            {savingSettings ? "SAVING..." : "SAVE SETTINGS"}
          </button>
          <button
            className="settings-wide-button"
            onClick={() => void loadInstalledMods()}
            type="button"
          >
            VERIFY MODS
          </button>
          <button
            className="settings-wide-button"
            onClick={() => void loadServers()}
            type="button"
          >
            REFRESH
          </button>
        </aside>
      </div>
    );
  }

  function renderRequiredModsDrawer() {
    if (!pendingJoin) return null;

    return (
      <div
        className="drawer-scrim required-mods-scrim"
        data-ui-click
        onMouseDown={() => {
          if (!installingRequiredMods) {
            setPendingJoin(null);
            setMissingWorkshopIds([]);
            setWorkshopProgress({});
          }
        }}
      >
        <aside
          aria-label="Required Mods"
          aria-modal="true"
          className="required-mods-drawer"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="drawer-header">
            <div>
              <span className="eyebrow">SERVER REQUIREMENTS</span>
              <h2>Required Mods</h2>
              <p>{pendingJoin.name} needs {missingWorkshopIds.length} mod{missingWorkshopIds.length === 1 ? "" : "s"} that are not installed.</p>
            </div>
            <button
              aria-label="Close required mods"
              className="drawer-close"
              disabled={installingRequiredMods}
              onClick={() => {
                setPendingJoin(null);
                setMissingWorkshopIds([]);
                setWorkshopProgress({});
              }}
              type="button"
            >
              <IoClose aria-hidden="true" />
            </button>
          </div>

          <div className="required-mod-list">
            {missingWorkshopIds.map((workshopId) => {
              const status = workshopProgress[workshopId];
              const percent = status?.percent;
              const complete = Boolean(
                status?.isInstalled && !status.needsUpdate && !status.isDownloading,
              );
              return (
                <div className="required-mod-item" key={workshopId}>
                  <div className="required-mod-copy">
                    <strong>Workshop {workshopId}</strong>
                    <span>{workshopId}</span>
                  </div>
                  <div className="required-mod-state">
                    <span>{complete ? "Installed" : status?.isDownloading ? "Downloading" : installingRequiredMods ? "Queued" : "Missing"}</span>
                    {status?.totalBytes ? (
                      <small>{formatBytes(status.downloadedBytes)} / {formatBytes(status.totalBytes)}</small>
                    ) : null}
                  </div>
                  {status ? (
                    <div
                      aria-label={`Download progress for ${workshopId}`}
                      className={percent === null ? "required-mod-progress indeterminate" : "required-mod-progress"}
                      role="progressbar"
                      aria-valuemax={100}
                      aria-valuemin={0}
                      aria-valuenow={percent ?? undefined}
                    >
                      {percent !== null ? <span style={{ width: `${percent}%` }} /> : <span />}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="required-mod-actions">
            <button
              className="ghost-button"
              disabled={installingRequiredMods}
              onClick={() => {
                setPendingJoin(null);
                setMissingWorkshopIds([]);
                setWorkshopProgress({});
              }}
              type="button"
            >
              CANCEL
            </button>
            <button
              className="join-button"
              disabled={installingRequiredMods}
              onClick={() => void installRequiredModsAndJoin()}
              type="button"
            >
              {installingRequiredMods ? "INSTALLING..." : "INSTALL & JOIN"}
            </button>
          </div>
        </aside>
      </div>
    );
  }

  function renderServerDrawer() {
    if (!selectedServer) return null;
    const address = `${selectedServer.ip}:${selectedServer.gamePort}`;
    return (
      <div
        className="drawer-scrim server-info-scrim"
        data-ui-click
        onMouseDown={() => setSelectedServer(null)}
      >
        <aside
          aria-label={`${selectedServer.name} server info`}
          aria-modal="true"
          className="server-info-drawer"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="drawer-header server-info-header">
            <div>
              <span className="eyebrow">SERVER INFO</span>
              <h2>{selectedServer.name}</h2>
            </div>
            <button
              aria-label="Close server info"
              className="drawer-close"
              onClick={() => setSelectedServer(null)}
              type="button"
            >
              <IoClose aria-hidden="true" />
            </button>
          </div>

          <div className="server-info-address-row">
            <div>
              <span>Server IP</span>
              <strong>{address}</strong>
            </div>
            <button
              aria-label="Copy server IP"
              className="server-copy-button"
              onClick={() => void copyServerAddress(selectedServer)}
              type="button"
            >
              <FiCopy aria-hidden="true" />
            </button>
          </div>

          <dl className="server-info-grid">
            <div><dt>Map</dt><dd>{selectedServer.map || "--"}</dd></div>
            <div><dt>Players</dt><dd>{selectedServer.players} / {selectedServer.capacity}</dd></div>
            <div><dt>Ping</dt><dd>{selectedServer.ping === null ? "--" : `${selectedServer.ping} ms`}</dd></div>
            <div><dt>Perspective</dt><dd>{selectedServer.firstPersonOnly ? "1PP" : "3PP"}</dd></div>
            <div><dt>Status</dt><dd>{selectedServer.status}</dd></div>
            <div><dt>Password</dt><dd>{selectedServer.isPassworded ? "Required" : "No"}</dd></div>
          </dl>

          <section className="server-required-mods">
            <div className="server-required-mods-heading">
              <span className="eyebrow">REQUIRED MODS</span>
              <strong>{selectedServer.requiredWorkshopIds.length}</strong>
            </div>
            {selectedServer.requiredWorkshopIds.length === 0 ? (
              <div className="server-mod-empty">Vanilla server — no Workshop mods required.</div>
            ) : (
              <div className="server-mod-list">
                {selectedServer.requiredWorkshopIds.map((workshopId) => {
                  const installed = installedModById.get(workshopId);
                  return (
                    <div className="server-mod-row" key={workshopId}>
                      <div>
                        <strong>{installed?.name ?? `Workshop ${workshopId}`}</strong>
                        <span>{workshopId}</span>
                      </div>
                      <span className={installed ? "server-mod-installed" : "server-mod-missing"}>
                        {installed ? "Installed" : "Required"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <button
            className="join-button server-info-join"
            disabled={joiningId === serverIdentity(selectedServer)}
            onClick={() => void joinServer(selectedServer)}
            type="button"
          >
            {joiningId === serverIdentity(selectedServer) ? "JOINING..." : "JOIN"}
          </button>
        </aside>
      </div>
    );
  }

  function renderModDrawer() {
    if (!selectedMod) return null;
    return (
      <div className="drawer-scrim" data-ui-click onMouseDown={() => setSelectedMod(null)}>
        <aside
          aria-label={selectedMod.name}
          aria-modal="true"
          className="mod-details-drawer"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="drawer-header">
            <div>
              <span className="eyebrow">WORKSHOP MOD</span>
              <h2>{selectedMod.name}</h2>
            </div>
            <button
              aria-label="Close mod details"
              className="drawer-close"
              onClick={() => setSelectedMod(null)}
              type="button"
            >
              <IoClose aria-hidden="true" />
            </button>
          </div>
          <div className="drawer-preview">
            <img alt="" src={selectedMod.previewUrl ?? MONARCH_LOGO_DATA_URI} />
          </div>
          <div className="mod-detail-status-row">
            <span>{modStateLabel(selectedMod)}</span>
            <span>{selectedMod.isSubscribed ? "Subscribed" : "Installed locally"}</span>
          </div>
          <dl className="mod-detail-list">
            <div><dt>Workshop ID</dt><dd>{selectedMod.workshopId}</dd></div>
            <div><dt>Update</dt><dd>{selectedMod.needsUpdate ? "Update available" : "Up to date"}</dd></div>
            <div><dt>Subscription</dt><dd>{selectedMod.isSubscribed ? "Subscribed" : "Not subscribed"}</dd></div>
            <div><dt>Folder</dt><dd>{selectedMod.path}</dd></div>
          </dl>
          <div className="drawer-actions">
            <button
              className="ghost-button icon-button"
              disabled={modBusy !== null}
              onClick={() => void openModFolder(selectedMod)}
              type="button"
            >
              <VscFiles aria-hidden="true" />
              <span>OPEN FOLDER</span>
            </button>
            <button
              className="join-button icon-button"
              disabled={modBusy !== null || selectedMod.isDownloading}
              onClick={() => void updateMod(selectedMod)}
              type="button"
            >
              <RxUpdate aria-hidden="true" />
              <span>{selectedMod.needsUpdate ? "UPDATE" : "CHECK / UPDATE"}</span>
            </button>
            <button
              className="danger-action icon-button"
              disabled={modBusy !== null}
              onClick={() => void uninstallMod(selectedMod)}
              type="button"
            >
              <FaTrashCan aria-hidden="true" />
              <span>UNINSTALL</span>
            </button>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="launcher-shell figma-shell" onClickCapture={handleInteractiveClick}>
      <aside aria-label="Monarch Launcher" className="sidebar figma-sidebar">
        <div className="brand figma-rail-brand">
          <img alt="Monarch M" className="brand-mark-image" src={MONARCH_LOGO_DATA_URI} />
        </div>
        <Navigation active={activeView} onSelect={selectView} />
        <div className="sidebar-footer">
          <UpdatePanel api={api} compact />
          <div className="sidebar-version">v0.4.0</div>
        </div>
      </aside>
      <main className="main-panel figma-main-panel">
        {actionError ? <StatusBanner tone="error">{actionError}</StatusBanner> : null}
        {actionMessage ? <StatusBanner tone="success">{actionMessage}</StatusBanner> : null}
        {activeView === "Servers" || activeView === "Settings" ? renderServers() : null}
        {activeView === "Favorites" ? renderCollection("Favorites", favorites) : null}
        {activeView === "Recent" ? renderCollection("Recent", recent) : null}
        {activeView === "Mods" ? renderMods() : null}
      </main>
      {renderSettingsDrawer()}
      {renderServerDrawer()}
      {renderRequiredModsDrawer()}
      {renderModDrawer()}
    </div>
  );
}
