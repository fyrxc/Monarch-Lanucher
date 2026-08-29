"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
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
import { Navigation, type LauncherView } from "./navigation";
import { ServerFiltersPanel } from "./server-filters";
import { ServerTable } from "./server-table";
import { StatusBanner } from "./status-banner";
import { UpdatePanel } from "./update-panel";

const SERVER_PAGE_SIZE = 100;

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

export function AppShell({ api = tauriApi }: { api?: LauncherApi }) {
  const [activeView, setActiveView] = useState<LauncherView>("Servers");
  const [servers, setServers] = useState<DayzServer[]>([]);
  const [favorites, setFavorites] = useState<DayzServer[]>([]);
  const [recent, setRecent] = useState<DayzServer[]>([]);
  const [installedMods, setInstalledMods] = useState<InstalledMod[]>([]);
  const [filters, setFilters] = useState<ServerFilters>(emptyFilters);
  const [serverPage, setServerPage] = useState(1);
  const [settings, setSettings] = useState<LauncherSettings>(emptySettings);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loadingServers, setLoadingServers] = useState(true);
  const [loadingMods, setLoadingMods] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const deferredSearch = useDeferredValue(filters.search);

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
      setInstalledMods(await api.getInstalledMods());
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
          setSettings(nextSettings);
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

  const deferredFilters = useMemo(
    () => ({ ...filters, search: deferredSearch }),
    [deferredSearch, filters],
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
      setActionError(null);
      try {
        await api.toggleFavorite(server);
        await loadFavorites();
      } catch (error) {
        setActionError(errorMessage(error));
      }
    },
    [api, loadFavorites],
  );

  const joinServer = useCallback(
    async (server: DayzServer) => {
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
    [api, loadRecent],
  );

  async function clearRecent() {
    setActionError(null);
    try {
      await api.clearRecent();
      setRecent([]);
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }

  async function saveSettings() {
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

  function renderServers() {
    return (
      <>
        <div className="view-toolbar">
          <div>
            <h1>Servers</h1>
            <p>Public DayZ servers load automatically.</p>
          </div>
          <button className="ghost-button" onClick={() => void loadServers()} type="button">
            Refresh
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
                  onClick={() => setServerPage(serverPageResult.page - 1)}
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
                  onClick={() => setServerPage(serverPageResult.page + 1)}
                  type="button"
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </>
    );
  }

  function renderCollection(title: "Favorites" | "Recent", collection: DayzServer[]) {
    return (
      <>
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
      </>
    );
  }

  function renderMods() {
    return (
      <>
        <div className="view-toolbar">
          <div>
            <h1>Mods</h1>
            <p>Installed DayZ Workshop content detected from your Steam libraries.</p>
          </div>
          <button
            className="ghost-button"
            disabled={loadingMods}
            onClick={() => void loadInstalledMods()}
            type="button"
          >
            {loadingMods ? "Scanning..." : "Refresh"}
          </button>
        </div>

        {loadingMods ? (
          <div className="loading-state">Scanning Steam Workshop folders...</div>
        ) : installedMods.length === 0 ? (
          <div className="empty-state">No installed DayZ Workshop mods were detected.</div>
        ) : (
          <div className="mods-list" aria-label="Installed DayZ Workshop mods">
            {installedMods.map((mod) => (
              <article className="mod-card" key={mod.workshopId}>
                <div className="mod-card-main">
                  <strong>{mod.name}</strong>
                  <span>Workshop ID {mod.workshopId}</span>
                </div>
                <code>{mod.path}</code>
              </article>
            ))}
          </div>
        )}
      </>
    );
  }

  function renderSettings() {
    return (
      <>
        <div className="view-toolbar">
          <div>
            <h1>Settings</h1>
            <p>DayZ identity, launch options, install detection, and launcher updates.</p>
          </div>
        </div>
        <div className="settings-grid">
          <section className="settings-card">
            <h2>DayZ</h2>
            <label className="settings-label">
              <span>Player Name</span>
              <input
                className="field"
                onChange={(event) => setSettings({ ...settings, dayzName: event.target.value })}
                placeholder="Your in-game name"
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
            <h2>System</h2>
            {systemStatus ? (
              <dl className="system-list">
                <div>
                  <dt>Steam</dt>
                  <dd>{systemStatus.steamFound ? "Detected" : "Not detected"}</dd>
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
      </>
    );
  }

  return (
    <div className="launcher-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <strong>MONARCH</strong>
            <span>DAYZ LAUNCHER</span>
          </div>
        </div>
        <Navigation active={activeView} onSelect={setActiveView} />
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
    </div>
  );
}
