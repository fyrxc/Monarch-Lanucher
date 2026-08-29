"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { IoSettingsOutline } from "react-icons/io5";
import type { LauncherApi } from "../lib/api";
import { tauriApi } from "../lib/api";
import { MONARCH_LOGO_DATA_URL } from "../lib/branding";
import { filterServers, type ServerFilters } from "../lib/filters";
import type {
  DayzServer,
  InstalledMod,
  LauncherSettings,
  SystemStatus,
  WorkshopDownloadProgress,
} from "../lib/models";
import { paginate } from "../lib/pagination";
import { readServerCache, writeServerCache } from "../lib/server-cache";
import { serverIdentity } from "../lib/server-id";
import { useGlobalClickSound } from "../lib/use-global-click-sound";
import { useLauncherSession } from "../lib/use-launcher-session";
import { useLiveServerPing } from "../lib/use-live-server-ping";
import { DayzRunningDialog } from "./dayz-running-dialog";
import { ModsView } from "./mods-view";
import { Navigation, type LauncherView } from "./navigation";
import { PasswordDialog } from "./password-dialog";
import { ServerFiltersPanel } from "./server-filters";
import { ServerTable } from "./server-table";
import { SettingsContent } from "./settings-content";
import { SetupModsDialog } from "./setup-mods-dialog";
import { SidebarUpdate } from "./sidebar-update";
import { SlidePanel } from "./slide-panel";
import { StatusBanner } from "./status-banner";

const SERVER_PAGE_SIZE = 100;
const WORKSHOP_PROGRESS_POLL_MS = 1500;
type SetupBusy = "setup" | "check";

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
  dayzPath: "",
  extraLaunchParameters: "",
  skipBattleye: false,
  discordPresence: true,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeDetectedDayzPath(path: string | null): string {
  if (!path) return "";
  return path.replace(/[\\/]DayZ_x64\.exe$/i, "");
}

export function AppShell({ api = tauriApi }: { api?: LauncherApi }) {
  useGlobalClickSound();

  const initialServers = useMemo(() => readServerCache(), []);
  const [activeView, setActiveView] = useState<LauncherView>("Servers");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passwordServer, setPasswordServer] = useState<DayzServer | null>(null);
  const [runningServer, setRunningServer] = useState<DayzServer | null>(null);
  const [closingDayz, setClosingDayz] = useState(false);
  const [setupServer, setSetupServer] = useState<DayzServer | null>(null);
  const [setupMissingIds, setSetupMissingIds] = useState<string[]>([]);
  const [setupReady, setSetupReady] = useState(false);
  const [setupBusy, setSetupBusy] = useState<SetupBusy | null>(null);
  const [setupMonitoring, setSetupMonitoring] = useState(false);
  const [setupProgress, setSetupProgress] = useState<WorkshopDownloadProgress[]>([]);
  const [servers, setServers] = useState<DayzServer[]>(initialServers);
  const [favorites, setFavorites] = useState<DayzServer[]>([]);
  const [recent, setRecent] = useState<DayzServer[]>([]);
  const [installedMods, setInstalledMods] = useState<InstalledMod[]>([]);
  const [filters, setFilters] = useState<ServerFilters>(emptyFilters);
  const [serverPage, setServerPage] = useState(1);
  const [settings, setSettings] = useState<LauncherSettings>(emptySettings);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loadingServers, setLoadingServers] = useState(initialServers.length === 0);
  const [loadingMods, setLoadingMods] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const deferredSearch = useDeferredValue(filters.search);

  const loadServers = useCallback(async () => {
    setServerError(null);
    try {
      const result = await api.getServers();
      setServers(result.servers);
      writeServerCache(result.servers);
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

  const loadSettings = useCallback(async () => {
    try {
      const [nextSettings, status] = await Promise.all([api.getSettings(), api.getSystemStatus()]);
      const steamDefault = status.steamPersonaName?.trim() ?? "";
      const configuredPath = nextSettings.dayzPath?.trim() ?? "";
      const normalized: LauncherSettings = {
        ...emptySettings,
        ...nextSettings,
        dayzPath: configuredPath || normalizeDetectedDayzPath(status.dayzPath),
        skipBattleye: nextSettings.skipBattleye ?? false,
        discordPresence: nextSettings.discordPresence ?? true,
      };
      setSettings(
        normalized.dayzName.trim() || !steamDefault
          ? normalized
          : { ...normalized, dayzName: steamDefault },
      );
      setSystemStatus(status);
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }, [api]);

  const session = useLauncherSession(api, settings.discordPresence ?? true, loadRecent);

  useEffect(() => {
    void loadServers();
    void loadFavorites();
    void loadSettings();
    void loadInstalledMods();
  }, [loadFavorites, loadInstalledMods, loadServers, loadSettings]);

  useEffect(() => {
    if (activeView === "Recent") void loadRecent();
  }, [activeView, loadRecent]);

  useEffect(() => {
    if (!setupServer || !setupMonitoring || setupReady || setupMissingIds.length === 0) return;
    let cancelled = false;
    const workshopIds = [...setupMissingIds];

    const refreshProgress = async () => {
      try {
        const progress = await api.getWorkshopDownloadProgress(workshopIds);
        if (cancelled) return;
        setSetupProgress(progress);
        const allInstalled =
          progress.length === workshopIds.length &&
          progress.every((item) => item.isInstalled && !item.isDownloading && !item.needsUpdate);
        if (!allInstalled) return;
        const preflight = await api.prepareServerLaunch(setupServer);
        if (cancelled) return;
        setSetupMissingIds(preflight.missingWorkshopIds);
        setSetupReady(preflight.ready);
        if (preflight.ready) {
          setSetupMonitoring(false);
          setActionMessage("Required mods are ready. Press Join again when you are ready to play.");
        }
      } catch (error) {
        if (!cancelled) {
          setActionError(errorMessage(error));
          setSetupMonitoring(false);
        }
      }
    };

    void refreshProgress();
    const interval = window.setInterval(() => void refreshProgress(), WORKSHOP_PROGRESS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [api, setupMissingIds, setupMonitoring, setupReady, setupServer]);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((server) => serverIdentity(server))),
    [favorites],
  );
  const maps = useMemo(
    () => Array.from(new Set(servers.map((server) => server.map).filter(Boolean))).sort(),
    [servers],
  );
  const visibleServers = useMemo(
    () => filterServers(servers, { ...filters, search: deferredSearch }, favoriteIds),
    [deferredSearch, favoriteIds, filters, servers],
  );
  const serverPageResult = useMemo(
    () => paginate(visibleServers, serverPage, SERVER_PAGE_SIZE),
    [serverPage, visibleServers],
  );

  useLiveServerPing(
    api,
    activeView === "Servers" && servers.length > 0,
    serverPageResult.items,
    setServers,
  );

  const setupProgressSummary = useMemo(() => {
    if (setupProgress.length === 0) {
      return { percent: null as number | null, downloadedBytes: 0, totalBytes: 0 };
    }
    const downloadedBytes = setupProgress.reduce((sum, item) => sum + item.downloadedBytes, 0);
    const totalBytes = setupProgress.reduce((sum, item) => sum + item.totalBytes, 0);
    const percent =
      totalBytes > 0
        ? Math.max(0, Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)))
        : setupProgress.every((item) => item.isInstalled)
          ? 100
          : 0;
    return { percent, downloadedBytes, totalBytes };
  }, [setupProgress]);

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
    async (server: DayzServer, password?: string) => {
      setJoiningId(serverIdentity(server));
      setActionMessage(null);
      setActionError(null);
      try {
        if (password === undefined) await api.launchServer(server);
        else await api.launchServer(server, password);
        session.startSession(server);
        await loadRecent();
      } catch (error) {
        setActionError(errorMessage(error));
      } finally {
        setJoiningId(null);
      }
    },
    [api, loadRecent, session],
  );

  const requestJoin = useCallback(
    async (server: DayzServer) => {
      setJoiningId(serverIdentity(server));
      setActionMessage(null);
      setActionError(null);
      try {
        const preflight = await api.prepareServerLaunch(server);
        if (preflight.dayzRunning) {
          setRunningServer(server);
          return;
        }
        if (preflight.missingWorkshopIds.length > 0) {
          setSetupServer(server);
          setSetupMissingIds(preflight.missingWorkshopIds);
          setSetupProgress([]);
          setSetupMonitoring(false);
          setSetupReady(false);
          return;
        }
        if (server.isPassworded) {
          setPasswordServer(server);
          return;
        }
        await joinServer(server);
      } catch (error) {
        setActionError(errorMessage(error));
      } finally {
        setJoiningId(null);
      }
    },
    [api, joinServer],
  );

  const closeDayzAndJoin = useCallback(async () => {
    if (!runningServer) return;
    const server = runningServer;
    setClosingDayz(true);
    setActionError(null);
    try {
      await api.closeDayz();
      setRunningServer(null);
      await requestJoin(server);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setClosingDayz(false);
    }
  }, [api, requestJoin, runningServer]);

  async function setupRequiredMods() {
    if (!setupServer || setupMissingIds.length === 0) return;
    setSetupBusy("setup");
    setActionError(null);
    try {
      await api.setupServerMods(setupMissingIds);
      setSetupProgress([]);
      setSetupMonitoring(true);
      setActionMessage("Steam is setting up the required server mods.");
    } catch (error) {
      setActionError(errorMessage(error));
      setSetupMonitoring(false);
    } finally {
      setSetupBusy(null);
    }
  }

  async function checkRequiredMods() {
    if (!setupServer) return;
    setSetupBusy("check");
    try {
      const preflight = await api.prepareServerLaunch(setupServer);
      setSetupMissingIds(preflight.missingWorkshopIds);
      setSetupReady(preflight.ready);
      if (preflight.ready) {
        setSetupMonitoring(false);
        setActionMessage("Required mods are ready. Press Join again when you are ready to play.");
      }
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setSetupBusy(null);
    }
  }

  function closeSetupMods() {
    setSetupServer(null);
    setSetupMissingIds([]);
    setSetupProgress([]);
    setSetupMonitoring(false);
    setSetupReady(false);
    setSetupBusy(null);
  }

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
    setActionError(null);
    setActionMessage(null);
    try {
      await api.saveSettings(settings);
      if (!(settings.discordPresence ?? true) && api.clearDiscordPresence) {
        await api.clearDiscordPresence().catch(() => false);
      }
      setActionMessage("Settings saved.");
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setSavingSettings(false);
    }
  }

  function renderServerDirectory() {
    const showInitialLoader = loadingServers && servers.length === 0;
    const showEmptyError = serverError && servers.length === 0;

    return (
      <>
        <div className="view-toolbar">
          <div><h1>Servers</h1><p>Public DayZ servers load automatically.</p></div>
          <button className="ghost-button" onClick={() => void loadServers()} type="button">Refresh</button>
        </div>
        {warning ? <StatusBanner tone="warning">{warning}</StatusBanner> : null}
        {serverError ? (
          <StatusBanner action={<button className="banner-button" onClick={() => void loadServers()} type="button">Retry</button>} tone="error">
            {serverError}
          </StatusBanner>
        ) : null}
        {showInitialLoader ? <div className="loading-state">Loading public DayZ servers...</div> : showEmptyError ? null : (
          <>
            <ServerFiltersPanel
              filters={filters}
              maps={maps}
              onChange={(next) => { setFilters(next); setServerPage(1); }}
              onClear={() => { setFilters(emptyFilters); setServerPage(1); }}
              resultCount={visibleServers.length}
            />
            <ServerTable
              api={api}
              favoriteIds={favoriteIds}
              joiningId={joiningId}
              onFavorite={toggleFavorite}
              onJoin={(server) => void requestJoin(server)}
              servers={serverPageResult.items}
            />
            {visibleServers.length > 0 ? (
              <div className="server-pagination" aria-label="Server pages">
                <button className="ghost-button" disabled={serverPageResult.page <= 1} onClick={() => setServerPage(serverPageResult.page - 1)} type="button">Previous</button>
                <span>Page {serverPageResult.page} of {serverPageResult.pageCount} · {serverPageResult.total.toLocaleString()} servers</span>
                <button className="ghost-button" disabled={serverPageResult.page >= serverPageResult.pageCount} onClick={() => setServerPage(serverPageResult.page + 1)} type="button">Next</button>
              </div>
            ) : null}
          </>
        )}
      </>
    );
  }

  function renderCollection(kind: "Favorites" | "Recent", collection: DayzServer[]) {
    const isRecent = kind === "Recent";
    return (
      <>
        <div className="view-toolbar">
          <div>
            <h1>{isRecent ? "Played On" : "Favorite"}</h1>
            <p>{isRecent ? "Servers you recently joined through Monarch." : "Servers you saved."}</p>
          </div>
          {isRecent && collection.length > 0 ? <button className="ghost-button" onClick={() => void clearRecent()} type="button">Clear Played On</button> : null}
        </div>
        <ServerTable
          api={api}
          favoriteIds={favoriteIds}
          joiningId={joiningId}
          onFavorite={toggleFavorite}
          onJoin={(server) => void requestJoin(server)}
          servers={collection}
        />
      </>
    );
  }

  const visibleMessage = actionMessage ?? session.status;

  return (
    <div className="launcher-shell">
      <aside className="sidebar">
        <div aria-label="Monarch" className="brand">
          <img className="brand-logo" src={MONARCH_LOGO_DATA_URL} alt="Monarch" />
        </div>
        <Navigation active={activeView} onSelect={(view) => { setSettingsOpen(false); setActiveView(view); }} />
        <SidebarUpdate api={api} />
        <div className="sidebar-version">v0.4.0</div>
      </aside>

      <main className="main-panel">
        <div className="app-topbar">
          <button aria-expanded={settingsOpen} className="settings-trigger" onClick={() => setSettingsOpen(true)} type="button">
            <IoSettingsOutline aria-hidden="true" /><span>Settings</span>
          </button>
        </div>
        {actionError ? <StatusBanner tone="error">{actionError}</StatusBanner> : null}
        {visibleMessage ? <StatusBanner tone="success">{visibleMessage}</StatusBanner> : null}
        {activeView === "Servers" ? renderServerDirectory() : null}
        {activeView === "Favorites" ? renderCollection("Favorites", favorites) : null}
        {activeView === "Recent" ? renderCollection("Recent", recent) : null}
        {activeView === "Mods" ? (
          <ModsView
            api={api}
            loading={loadingMods}
            mods={installedMods}
            onChange={setInstalledMods}
            onError={setActionError}
            onMessage={setActionMessage}
            onRefresh={() => void loadInstalledMods()}
          />
        ) : null}
      </main>

      {runningServer ? <DayzRunningDialog busy={closingDayz} onCancel={() => setRunningServer(null)} onCloseAndJoin={() => void closeDayzAndJoin()} server={runningServer} /> : null}
      {setupServer ? (
        <SetupModsDialog
          busy={setupBusy}
          downloadedBytes={setupProgressSummary.downloadedBytes}
          missingWorkshopIds={setupMissingIds}
          onCheck={() => void checkRequiredMods()}
          onClose={closeSetupMods}
          onSetup={() => void setupRequiredMods()}
          progressPercent={setupProgressSummary.percent}
          ready={setupReady}
          server={setupServer}
          totalBytes={setupProgressSummary.totalBytes}
        />
      ) : null}
      {passwordServer ? (
        <PasswordDialog server={passwordServer} onJoin={(password) => { const server = passwordServer; setPasswordServer(null); void joinServer(server, password); }} />
      ) : null}

      <SlidePanel open={settingsOpen} title="Settings" onClose={() => setSettingsOpen(false)}>
        <SettingsContent
          api={api}
          onChange={setSettings}
          onError={setActionError}
          onMessage={setActionMessage}
          onRefresh={() => { void loadSettings(); void loadInstalledMods(); }}
          onSave={() => void saveSettings()}
          saving={savingSettings}
          settings={settings}
          systemStatus={systemStatus}
        />
      </SlidePanel>
    </div>
  );
}
