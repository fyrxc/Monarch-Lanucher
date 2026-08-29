"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { LauncherApi } from "../lib/api";
import { tauriApi } from "../lib/api";
import { filterServers, type ServerFilters } from "../lib/filters";
import {
  reconcileServerCollection,
  sortServersWithFavoritesFirst,
} from "../lib/live-server-collections";
import type {
  DayzServer,
  InstalledMod,
  LauncherSettings,
  SystemStatus,
  WorkshopDownloadProgress,
} from "../lib/models";
import { readServerCache, writeServerCache } from "../lib/server-cache";
import { serverIdentity } from "../lib/server-id";
import { useGlobalClickSound } from "../lib/use-global-click-sound";
import { useLauncherSession } from "../lib/use-launcher-session";
import { useLiveServerPing } from "../lib/use-live-server-ping";
import { DayzRunningDialog } from "./dayz-running-dialog";
import { MonarchDrawer } from "./monarch-drawer";
import type { LauncherView } from "./monarch-navigation";
import { MonarchServerFilters } from "./monarch-server-filters";
import { MonarchServerList } from "./monarch-server-list";
import { MonarchShell } from "./monarch-shell";
import { MonarchStatus } from "./monarch-status";
import { ModsView } from "./mods-view";
import { PasswordDialog } from "./password-dialog";
import { SettingsContent } from "./settings-content";
import { SetupModsDialog } from "./setup-mods-dialog";

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
  const liveFavorites = useMemo(
    () => reconcileServerCollection(favorites, servers),
    [favorites, servers],
  );
  const liveRecent = useMemo(
    () => reconcileServerCollection(recent, servers),
    [recent, servers],
  );
  const maps = useMemo(
    () => Array.from(new Set(servers.map((server) => server.map).filter(Boolean))).sort(),
    [servers],
  );
  const visibleServers = useMemo(
    () => filterServers(servers, { ...filters, search: deferredSearch }, favoriteIds),
    [deferredSearch, favoriteIds, filters, servers],
  );
  const favoriteFirstServers = useMemo(
    () => sortServersWithFavoritesFirst(visibleServers, favoriteIds),
    [favoriteIds, visibleServers],
  );
  const pingTargets = useMemo(() => {
    if (activeView === "Servers") return favoriteFirstServers;
    if (activeView === "Favorites") return liveFavorites;
    if (activeView === "Recent") return liveRecent;
    return [];
  }, [activeView, favoriteFirstServers, liveFavorites, liveRecent]);

  useLiveServerPing(api, pingTargets.length > 0, pingTargets, setServers);

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
        {warning ? <MonarchStatus tone="warning">{warning}</MonarchStatus> : null}
        {serverError ? (
          <MonarchStatus action={<button onClick={() => void loadServers()} type="button">Retry</button>} tone="error">
            {serverError}
          </MonarchStatus>
        ) : null}
        {showInitialLoader ? (
          <MonarchStatus>Loading servers...</MonarchStatus>
        ) : showEmptyError ? null : (
          <>
            <MonarchServerFilters
              filters={filters}
              maps={maps}
              onChange={setFilters}
              onClear={() => setFilters(emptyFilters)}
            />
            <MonarchServerList
              api={api}
              favoriteIds={favoriteIds}
              joiningId={joiningId}
              onFavorite={toggleFavorite}
              onJoin={(server) => void requestJoin(server)}
              servers={favoriteFirstServers}
            />
          </>
        )}
      </>
    );
  }

  function renderCollection(kind: "Favorites" | "Recent", collection: DayzServer[]) {
    return (
      <>
        {kind === "Recent" && collection.length > 0 ? (
          <MonarchStatus action={<button onClick={() => void clearRecent()} type="button">Clear Played On</button>}>
            {collection.length} recently played
          </MonarchStatus>
        ) : null}
        <MonarchServerList
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
    <>
      <MonarchShell
        activeView={activeView}
        onOpenSettings={() => setSettingsOpen(true)}
        onSelectView={(view) => {
          setSettingsOpen(false);
          setActiveView(view);
        }}
      >
        {actionError ? <MonarchStatus tone="error">{actionError}</MonarchStatus> : null}
        {visibleMessage ? <MonarchStatus tone="success">{visibleMessage}</MonarchStatus> : null}
        {activeView === "Servers" ? renderServerDirectory() : null}
        {activeView === "Favorites" ? renderCollection("Favorites", liveFavorites) : null}
        {activeView === "Recent" ? renderCollection("Recent", liveRecent) : null}
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
      </MonarchShell>

      {runningServer ? (
        <DayzRunningDialog
          busy={closingDayz}
          onCancel={() => setRunningServer(null)}
          onCloseAndJoin={() => void closeDayzAndJoin()}
          server={runningServer}
        />
      ) : null}
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
        <PasswordDialog
          server={passwordServer}
          onJoin={(password) => {
            const server = passwordServer;
            setPasswordServer(null);
            void joinServer(server, password);
          }}
        />
      ) : null}

      <MonarchDrawer label="Settings" onClose={() => setSettingsOpen(false)} open={settingsOpen}>
        <SettingsContent
          api={api}
          onChange={setSettings}
          onError={setActionError}
          onMessage={setActionMessage}
          onRefresh={() => {
            void loadSettings();
            void loadInstalledMods();
          }}
          onSave={() => void saveSettings()}
          saving={savingSettings}
          settings={settings}
          systemStatus={systemStatus}
        />
      </MonarchDrawer>
    </>
  );
}
