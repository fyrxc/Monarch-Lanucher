"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { FaTrashCan } from "react-icons/fa6";
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

const emptySettings: LauncherSettings = {
  dayzName: "",
  extraLaunchParameters: "",
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function modStateLabel(mod: InstalledMod): string {
  if (mod.isDownloading) return "Downloading";
  if (mod.needsUpdate) return "Update available";
  if (!mod.isSubscribed) return "Installed locally";
  return "Installed";
}

export function AppShell({ api = tauriApi }: { api?: LauncherApi }) {
  const [activeView, setActiveView] = useState<LauncherView>("Servers");
  const [servers, setServers] = useState<DayzServer[]>([]);
  const [favorites, setFavorites] = useState<DayzServer[]>([]);
  const [recent, setRecent] = useState<DayzServer[]>([]);
  const [installedMods, setInstalledMods] = useState<InstalledMod[]>([]);
  const [selectedMod, setSelectedMod] = useState<InstalledMod | null>(null);
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

  // Deferring the whole filter object keeps typing/toggles responsive while a large
  // public DayZ directory is being filtered in the background render lane.
  const deferredFilters = useDeferredValue(filters);

  useEffect(() => {
    const stored = window.localStorage.getItem(UI_SOUND_KEY);
    if (stored !== null) {
      setUiSoundsEnabled(stored !== "false");
    }
  }, []);

  const playUiSound = useCallback(() => {
    if (!uiSoundsEnabled) return;

    try {
      const audio = new Audio(UI_CLICK_SOUND_DATA_URI);
      audio.volume = 0.42;
      audio.currentTime = 0;
      const playback = audio.play();
      void playback?.catch(() => undefined);
    } catch {
      // UI audio should never block navigation or launcher actions.
    }
  }, [uiSoundsEnabled]);

  const selectView = useCallback(
    (view: LauncherView) => {
      if (view !== activeView) {
        playUiSound();
        setSelectedMod(null);
        setActiveView(view);
      }
    },
    [activeView, playUiSound],
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
      setSelectedMod((current) => {
        if (!current) return null;
        return nextMods.find((item) => item.workshopId === current.workshopId) ?? null;
      });
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
    if (activeView === "Recent") {
      void loadRecent();
    }

    if (activeView === "Mods") {
      void loadInstalledMods();
    }

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

  const updateFilters = useCallback((next: ServerFilters) => {
    setFilters(next);
    setServerPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(emptyFilters);
    setServerPage(1);
  }, []);

  const toggleFavorite = useCallback(
    async (server: DayzServer) => {
      playUiSound();
      setActionError(null);
      try {
        await api.toggleFavorite(server);
        await loadFavorites();
      } catch (error) {
        setActionError(errorMessage(error));
      }
    },
    [api, loadFavorites, playUiSound],
  );

  const joinServer = useCallback(
    async (server: DayzServer) => {
      playUiSound();
      const identity = serverIdentity(server);
      setJoiningId(identity);
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
    [api, loadRecent, playUiSound],
  );

  const openModFolder = useCallback(
    async (mod: InstalledMod) => {
      playUiSound();
      setModBusy({ id: mod.workshopId, action: "folder" });
      setActionMessage(null);
      setActionError(null);
      try {
        await api.openModFolder(mod.workshopId);
      } catch (error) {
        setActionError(errorMessage(error));
      } finally {
        setModBusy(null);
      }
    },
    [api, playUiSound],
  );

  const updateMod = useCallback(
    async (mod: InstalledMod) => {
      playUiSound();
      setModBusy({ id: mod.workshopId, action: "update" });
      setActionMessage(null);
      setActionError(null);
      try {
        await api.updateWorkshopMod(mod.workshopId);
        setActionMessage(`Steam is checking/downloading the latest ${mod.name} update.`);
        await loadInstalledMods();
      } catch (error) {
        setActionError(errorMessage(error));
      } finally {
        setModBusy(null);
      }
    },
    [api, loadInstalledMods, playUiSound],
  );

  const uninstallMod = useCallback(
    async (mod: InstalledMod) => {
      playUiSound();
      setModBusy({ id: mod.workshopId, action: "uninstall" });
      setActionMessage(null);
      setActionError(null);
      try {
        await api.unsubscribeWorkshopMod(mod.workshopId);
        setInstalledMods((current) =>
          current.filter((item) => item.workshopId !== mod.workshopId),
        );
        setSelectedMod((current) =>
          current?.workshopId === mod.workshopId ? null : current,
        );
        setActionMessage(`Unsubscribed ${mod.name} through Steam.`);
      } catch (error) {
        setActionError(errorMessage(error));
      } finally {
        setModBusy(null);
      }
    },
    [api, playUiSound],
  );

  const selectMod = useCallback(
    (mod: InstalledMod) => {
      playUiSound();
      setSelectedMod(mod);
    },
    [playUiSound],
  );

  async function clearRecent() {
    playUiSound();
    setActionError(null);
    try {
      await api.clearRecent();
      setRecent([]);
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }

  async function saveSettings() {
    playUiSound();
    setSavingSettings(true);
    setActionError(null);
    setActionMessage(null);
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
    if (uiSoundsEnabled) {
      playUiSound();
    }
    const next = !uiSoundsEnabled;
    setUiSoundsEnabled(next);
    window.localStorage.setItem(UI_SOUND_KEY, String(next));
  }

  function renderServers() {
    return (
      <div className="view-content view-enter">
        <div className="view-toolbar">
          <div>
            <h1>Servers</h1>
            <p>Public DayZ servers load automatically.</p>
          </div>
          <button
            className="ghost-button icon-button"
            onClick={() => {
              playUiSound();
              void loadServers();
            }}
            type="button"
          >
            <RxUpdate aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>

        {warning ? <StatusBanner tone="warning">{warning}</StatusBanner> : null}
        {serverError ? (
          <StatusBanner
            action={
              <button
                className="banner-button"
                onClick={() => {
                  playUiSound();
                  void loadServers();
                }}
                type="button"
              >
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
              onChange={updateFilters}
              onClear={clearFilters}
              resultCount={visibleServers.length}
            />
            <ServerTable
              favoriteIds={favoriteIds}
              joiningId={joiningId}
              onFavorite={toggleFavorite}
              onJoin={joinServer}
              servers={serverPageResult.items}
            />
            {visibleServers.length > 0 ? (
              <div className="server-pagination" aria-label="Server pages">
                <button
                  className="ghost-button"
                  disabled={serverPageResult.page <= 1}
                  onClick={() => {
                    playUiSound();
                    setServerPage(serverPageResult.page - 1);
                  }}
                  type="button"
                >
                  Previous
                </button>
                <span>
                  Page {serverPageResult.page} of {serverPageResult.pageCount} · {serverPageResult.total.toLocaleString()} servers
                </span>
                <button
                  className="ghost-button"
                  disabled={serverPageResult.page >= serverPageResult.pageCount}
                  onClick={() => {
                    playUiSound();
                    setServerPage(serverPageResult.page + 1);
                  }}
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
          onFavorite={toggleFavorite}
          onJoin={joinServer}
          servers={collection}
        />
      </div>
    );
  }

  function renderMods() {
    return (
      <div className="view-content view-enter mods-view">
        <div className="view-toolbar">
          <div>
            <h1>Mods</h1>
            <p>Steam Workshop mods installed for DayZ.</p>
          </div>
          <button
            className="ghost-button icon-button"
            disabled={loadingMods}
            onClick={() => {
              playUiSound();
              void loadInstalledMods();
            }}
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
                  onSelect={selectMod}
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

  function renderSettings() {
    return (
      <div className="view-content settings-view view-slide-enter">
        <div className="view-toolbar">
          <div>
            <h1>Settings</h1>
            <p>DayZ identity, launcher behavior, install detection, and updates.</p>
          </div>
        </div>

        <div className="settings-grid">
          <section className="settings-card settings-card-primary">
            <div className="settings-card-heading">
              <div>
                <span className="eyebrow">GAME</span>
                <h2>DayZ</h2>
              </div>
            </div>
            <label className="settings-label">
              <span>Player Name</span>
              <input
                className="field"
                onChange={(event) => setSettings({ ...settings, dayzName: event.target.value })}
                placeholder="Steam public name"
                value={settings.dayzName}
              />
            </label>
            <label className="settings-label">
              <span>Extra Launch Parameters</span>
              <input
                className="field"
                onChange={(event) =>
                  setSettings({ ...settings, extraLaunchParameters: event.target.value })
                }
                placeholder="-nosplash"
                value={settings.extraLaunchParameters}
              />
            </label>
            <button
              className="join-button save-button"
              disabled={savingSettings}
              onClick={() => void saveSettings()}
              type="button"
            >
              {savingSettings ? "SAVING..." : "SAVE SETTINGS"}
            </button>
          </section>

          <section className="settings-card">
            <div className="settings-card-heading">
              <div>
                <span className="eyebrow">LAUNCHER</span>
                <h2>Preferences</h2>
              </div>
            </div>
            <label className="settings-toggle-row">
              <div className="settings-toggle-copy">
                <span className="settings-toggle-icon" aria-hidden="true">
                  <HiOutlineSpeakerWave />
                </span>
                <span>
                  <strong>UI Sounds</strong>
                  <small>Play the Monarch click sound when selecting launcher controls.</small>
                </span>
              </div>
              <input
                aria-label="UI Sounds"
                checked={uiSoundsEnabled}
                onChange={toggleUiSounds}
                type="checkbox"
              />
            </label>
          </section>

          <section className="settings-card system-card">
            <div className="settings-card-heading">
              <div>
                <span className="eyebrow">SYSTEM</span>
                <h2>Steam & DayZ</h2>
              </div>
            </div>
            {systemStatus ? (
              <dl className="system-list">
                <div>
                  <dt>Steam</dt>
                  <dd>{systemStatus.steamFound ? "Detected" : "Not detected"}</dd>
                </div>
                <div>
                  <dt>Steam Name</dt>
                  <dd>{systemStatus.steamPersonaName ?? "--"}</dd>
                </div>
                <div>
                  <dt>DayZ</dt>
                  <dd>{systemStatus.dayzFound ? "Installed" : "Not installed"}</dd>
                </div>
                <div>
                  <dt>Steam Path</dt>
                  <dd>{systemStatus.steamPath ?? "--"}</dd>
                </div>
                <div>
                  <dt>DayZ Path</dt>
                  <dd>{systemStatus.dayzPath ?? "--"}</dd>
                </div>
              </dl>
            ) : (
              <div className="loading-state compact">Detecting Steam and DayZ...</div>
            )}
          </section>

          <UpdatePanel api={api} />
        </div>
      </div>
    );
  }

  function renderModDrawer() {
    if (!selectedMod) return null;

    return (
      <div
        className="drawer-scrim"
        onMouseDown={() => {
          playUiSound();
          setSelectedMod(null);
        }}
      >
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
              onClick={() => {
                playUiSound();
                setSelectedMod(null);
              }}
              type="button"
            >
              <IoClose aria-hidden="true" />
            </button>
          </div>

          <div className="drawer-preview">
            <img
              alt=""
              src={selectedMod.previewUrl ?? MONARCH_LOGO_DATA_URI}
            />
          </div>

          <div className="mod-detail-status-row">
            <span>{modStateLabel(selectedMod)}</span>
            <span>{selectedMod.isSubscribed ? "Subscribed" : "Installed locally"}</span>
          </div>

          <dl className="mod-detail-list">
            <div>
              <dt>Workshop ID</dt>
              <dd>{selectedMod.workshopId}</dd>
            </div>
            <div>
              <dt>Update</dt>
              <dd>{selectedMod.needsUpdate ? "Update available" : "Up to date"}</dd>
            </div>
            <div>
              <dt>Subscription</dt>
              <dd>{selectedMod.isSubscribed ? "Subscribed" : "Not subscribed"}</dd>
            </div>
            <div>
              <dt>Folder</dt>
              <dd>{selectedMod.path}</dd>
            </div>
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
    <div className="launcher-shell">
      <aside className="sidebar">
        <div className="brand">
          <img alt="" className="brand-mark-image" src={MONARCH_LOGO_DATA_URI} />
          <div>
            <strong>MONARCH</strong>
            <span>DAYZ LAUNCHER</span>
          </div>
        </div>
        <Navigation active={activeView} onSelect={selectView} />
        <div className="sidebar-version">v0.4.0</div>
      </aside>

      <main className="main-panel">
        {actionError ? <StatusBanner tone="error">{actionError}</StatusBanner> : null}
        {actionMessage ? <StatusBanner tone="success">{actionMessage}</StatusBanner> : null}

        {activeView === "Servers" ? renderServers() : null}
        {activeView === "Favorites" ? renderCollection("Favorites", favorites) : null}
        {activeView === "Recent" ? renderCollection("Recent", recent) : null}
        {activeView === "Mods" ? renderMods() : null}
        {activeView === "Settings" ? renderSettings() : null}
      </main>

      {renderModDrawer()}
    </div>
  );
}
