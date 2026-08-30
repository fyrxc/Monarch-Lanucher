"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { LauncherApi } from "../lib/api";
import { tauriApi } from "../lib/api";
import { filterServers, type ServerFilters } from "../lib/filters";
import type {
  DayzServer,
  InstalledMod,
  LauncherSettings,
  RequiredMod,
  SystemStatus,
  WorkshopModMetadata,
} from "../lib/models";
import { serverIdentity } from "../lib/server-id";
import { playNotificationBeep, playUiClick } from "../lib/sounds";
import { ModCard } from "./mod-card";
import { Navigation, type LauncherView } from "./navigation";
import { ServerFiltersPanel } from "./server-filters";
import { ServerJoinDialog } from "./server-join-dialog";
import { ServerTable } from "./server-table";
import { StatusBanner } from "./status-banner";
import { UpdatePanel } from "./update-panel";

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
  skipBattlEye: false,
  uiSounds: true,
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function mergeWorkshopMetadata(
  mods: InstalledMod[],
  metadata: WorkshopModMetadata[],
): InstalledMod[] {
  const byId = new Map(metadata.map((item) => [item.workshopId, item]));
  return mods.map((mod) => {
    const details = byId.get(mod.workshopId);
    if (!details) return mod;
    return {
      ...mod,
      name: details.name,
      previewUrl: details.previewUrl,
      creatorId: details.creatorId,
      workshopUrl: details.workshopUrl,
      creatorUrl: details.creatorUrl,
    };
  });
}

export function AppShell({ api = tauriApi }: { api?: LauncherApi }) {
  const [activeView, setActiveView] = useState<LauncherView>("Servers");
  const [servers, setServers] = useState<DayzServer[]>([]);
  const [favorites, setFavorites] = useState<DayzServer[]>([]);
  const [recent, setRecent] = useState<DayzServer[]>([]);
  const [installedMods, setInstalledMods] = useState<InstalledMod[]>([]);
  const [filters, setFilters] = useState<ServerFilters>(emptyFilters);
  const [settings, setSettings] = useState<LauncherSettings>(emptySettings);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [runtimeStarted, setRuntimeStarted] = useState(false);
  const [loadingServers, setLoadingServers] = useState(false);
  const [loadingMods, setLoadingMods] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [modBusy, setModBusy] = useState<{ id: string; action: ModAction } | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [steamError, setSteamError] = useState<string | null>(null);
  const [openingSteam, setOpeningSteam] = useState(false);
  const [joinTarget, setJoinTarget] = useState<DayzServer | null>(null);
  const [joinRequiredMods, setJoinRequiredMods] = useState<RequiredMod[]>([]);
  const [joinPassword, setJoinPassword] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinSyncing, setJoinSyncing] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pollRequiredMods, setPollRequiredMods] = useState(false);
  const deferredSearch = useDeferredValue(filters.search);

  const refreshSystemStatus = useCallback(async () => {
    try {
      const status = await api.getSystemStatus();
      setSystemStatus(status);
      if (status.steamRunning) setSteamError(null);
    } catch (error) {
      setSteamError(errorMessage(error));
    }
  }, [api]);

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

  const enrichInstalledMods = useCallback(
    async (mods: InstalledMod[]) => {
      if (mods.length === 0 || !api.getWorkshopModMetadata) return;
      try {
        const metadata = await api.getWorkshopModMetadata(mods.map((mod) => mod.workshopId));
        setInstalledMods((current) => mergeWorkshopMetadata(current, metadata));
      } catch {
        // Local mod state is still useful if Steam's metadata endpoint is unavailable.
      }
    },
    [api],
  );

  const loadInstalledMods = useCallback(async () => {
    setLoadingMods(true);
    setActionError(null);
    try {
      const mods = await api.getInstalledMods();
      setInstalledMods(mods);
      setLoadingMods(false);
      void enrichInstalledMods(mods);
      return;
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setLoadingMods(false);
    }
  }, [api, enrichInstalledMods]);

  const loadJoinRequiredMods = useCallback(
    async (server: DayzServer, showLoading = true) => {
      if (showLoading) setJoinLoading(true);
      setJoinError(null);
      try {
        const nextMods = await api.getRequiredMods(server);
        setJoinRequiredMods(nextMods);
        if (nextMods.every((mod) => mod.state === "installed")) {
          setPollRequiredMods(false);
        }
      } catch (error) {
        setJoinError(errorMessage(error));
        setPollRequiredMods(false);
      } finally {
        if (showLoading) setJoinLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    let active = true;
    void Promise.all([api.getSystemStatus(), api.getSettings()])
      .then(([status, savedSettings]) => {
        if (!active) return;
        const steamDefault = status.steamPersonaName?.trim() ?? "";
        setSystemStatus(status);
        setSettings(
          savedSettings.dayzName.trim() || !steamDefault
            ? savedSettings
            : { ...savedSettings, dayzName: steamDefault },
        );
      })
      .catch((error) => {
        if (active) setSteamError(errorMessage(error));
      });

    return () => {
      active = false;
    };
  }, [api]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshSystemStatus();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [refreshSystemStatus]);

  useEffect(() => {
    if (!systemStatus) return;
    if (!systemStatus.steamRunning) {
      setRuntimeStarted(false);
      return;
    }
    if (runtimeStarted) return;
    setRuntimeStarted(true);
    void loadServers();
    void loadFavorites();
  }, [loadFavorites, loadServers, runtimeStarted, systemStatus]);

  useEffect(() => {
    if (!systemStatus?.steamRunning) return;
    if (activeView === "Recent") void loadRecent();
    if (activeView === "Mods") void loadInstalledMods();
  }, [activeView, loadInstalledMods, loadRecent, systemStatus?.steamRunning]);

  useEffect(() => {
    if (!systemStatus?.steamRunning) return;
    void api.setDiscordPresence(activeView).catch(() => undefined);
  }, [activeView, api, systemStatus?.steamRunning]);

  useEffect(() => {
    if (!settings.uiSounds) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("button, a, input, select, label")) playUiClick();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [settings.uiSounds]);

  useEffect(() => {
    if (!settings.uiSounds || (!actionMessage && !actionError)) return;
    playNotificationBeep();
  }, [actionError, actionMessage, settings.uiSounds]);

  useEffect(() => {
    if (!joinTarget || !pollRequiredMods) return;
    const timer = window.setInterval(() => {
      void loadJoinRequiredMods(joinTarget, false);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [joinTarget, loadJoinRequiredMods, pollRequiredMods]);

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

  const launchServer = useCallback(
    async (server: DayzServer, password?: string) => {
      const identity = serverIdentity(server);
      setJoiningId(identity);
      setActionMessage(null);
      setActionError(null);
      setJoinError(null);
      try {
        if (password === undefined) await api.launchServer(server);
        else await api.launchServer(server, password);
        setActionMessage(`Launching ${server.name}`);
        setJoinTarget(null);
        setPollRequiredMods(false);
        await loadRecent();
      } catch (error) {
        if (joinTarget) setJoinError(errorMessage(error));
        else setActionError(errorMessage(error));
      } finally {
        setJoiningId(null);
      }
    },
    [api, joinTarget, loadRecent],
  );

  const beginJoin = useCallback(
    async (server: DayzServer) => {
      setActionMessage(null);
      setActionError(null);
      setJoinError(null);

      if (!server.isPassworded && server.requiredWorkshopIds.length === 0) {
        await launchServer(server);
        return;
      }

      setJoinTarget(server);
      setJoinPassword("");
      setJoinRequiredMods([]);
      setPollRequiredMods(false);

      if (server.requiredWorkshopIds.length > 0) await loadJoinRequiredMods(server);
      else setJoinLoading(false);
    },
    [launchServer, loadJoinRequiredMods],
  );

  const syncJoinRequiredMods = useCallback(async () => {
    if (!joinTarget) return;
    setJoinSyncing(true);
    setJoinError(null);
    try {
      await api.syncRequiredMods(joinTarget);
      setJoinRequiredMods((current) =>
        current.map((mod) =>
          mod.state === "missing" ? { ...mod, state: "updating" as const } : mod,
        ),
      );
      setPollRequiredMods(true);
    } catch (error) {
      setJoinError(errorMessage(error));
    } finally {
      setJoinSyncing(false);
    }
  }, [api, joinTarget]);

  const closeJoinDialog = useCallback(() => {
    if (joiningId) return;
    setJoinTarget(null);
    setJoinRequiredMods([]);
    setJoinPassword("");
    setJoinError(null);
    setPollRequiredMods(false);
  }, [joiningId]);

  const openModFolder = useCallback(
    async (mod: InstalledMod) => {
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
        await loadInstalledMods();
      } catch (error) {
        setActionError(errorMessage(error));
      } finally {
        setModBusy(null);
      }
    },
    [api, loadInstalledMods],
  );

  const uninstallMod = useCallback(
    async (mod: InstalledMod) => {
      setModBusy({ id: mod.workshopId, action: "uninstall" });
      setActionMessage(null);
      setActionError(null);
      try {
        await api.unsubscribeWorkshopMod(mod.workshopId);
        setInstalledMods((current) => current.filter((item) => item.workshopId !== mod.workshopId));
        setActionMessage(`Unsubscribed ${mod.name} through Steam.`);
      } catch (error) {
        setActionError(errorMessage(error));
      } finally {
        setModBusy(null);
      }
    },
    [api],
  );

  const persistSettings = useCallback(
    (next: LauncherSettings) => {
      setSettings(next);
      setActionError(null);
      void api.saveSettings(next).catch((error) => setActionError(errorMessage(error)));
    },
    [api],
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

  async function openSteam() {
    setOpeningSteam(true);
    setSteamError(null);
    try {
      await api.openSteam();
      await refreshSystemStatus();
    } catch (error) {
      setSteamError(errorMessage(error));
    } finally {
      setOpeningSteam(false);
    }
  }

  function renderServers() {
    return (
      <>
        <div className="view-toolbar">
          <div>
            <h1>Servers</h1>
            <p>Public DayZ servers load automatically. Favorites stay at the top.</p>
          </div>
          <button className="ghost-button" onClick={() => void loadServers()} type="button">Refresh</button>
        </div>
        {warning ? <StatusBanner tone="warning">{warning}</StatusBanner> : null}
        {serverError ? (
          <StatusBanner action={<button className="banner-button" onClick={() => void loadServers()} type="button">Retry</button>} tone="error">
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
              onChange={setFilters}
              onClear={() => setFilters(emptyFilters)}
              resultCount={visibleServers.length}
            />
            <ServerTable
              favoriteIds={favoriteIds}
              joiningId={joiningId}
              onFavorite={toggleFavorite}
              onJoin={(server) => void beginJoin(server)}
              servers={visibleServers}
            />
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
            <button className="ghost-button" onClick={() => void clearRecent()} type="button">Clear Recent</button>
          ) : null}
        </div>
        <ServerTable
          favoriteIds={favoriteIds}
          joiningId={joiningId}
          onFavorite={toggleFavorite}
          onJoin={(server) => void beginJoin(server)}
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
            <p>Local Workshop state appears first; Steam artwork and creator details fill in after.</p>
          </div>
          <button className="ghost-button" disabled={loadingMods} onClick={() => void loadInstalledMods()} type="button">
            {loadingMods ? "Scanning..." : "Refresh"}
          </button>
        </div>
        {loadingMods && installedMods.length === 0 ? (
          <div className="loading-state">Scanning installed DayZ Workshop mods...</div>
        ) : installedMods.length === 0 ? (
          <div className="empty-state">No installed DayZ Workshop mods were detected.</div>
        ) : (
          <div className="mods-list" aria-label="Installed DayZ Workshop mods">
            {installedMods.map((mod) => (
              <ModCard
                busyAction={modBusy?.id === mod.workshopId ? modBusy.action : null}
                key={mod.workshopId}
                mod={mod}
                onOpenFolder={(item) => void openModFolder(item)}
                onUninstall={(item) => void uninstallMod(item)}
                onUpdate={(item) => void updateMod(item)}
              />
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
            <p>Changes save immediately.</p>
          </div>
        </div>
        <div className="settings-grid">
          <section className="settings-card">
            <h2>DayZ</h2>
            <label className="settings-label">
              <span>Player Name</span>
              <input
                className="field"
                onChange={(event) => persistSettings({ ...settings, dayzName: event.target.value })}
                placeholder="Steam public name"
                value={settings.dayzName}
              />
            </label>
            <label className="settings-label">
              <span>Extra Launch Parameters</span>
              <input
                className="field"
                onChange={(event) => persistSettings({ ...settings, extraLaunchParameters: event.target.value })}
                placeholder="-nosplash"
                value={settings.extraLaunchParameters}
              />
            </label>
            <label className="settings-toggle">
              <input
                aria-label="Skip BattlEye"
                checked={settings.skipBattlEye}
                onChange={(event) => persistSettings({ ...settings, skipBattlEye: event.target.checked })}
                type="checkbox"
              />
              <span><strong>Skip BattlEye</strong><small>Launch DayZ_x64.exe directly, matching DZSA behavior.</small></span>
            </label>
            <label className="settings-toggle">
              <input
                aria-label="UI Sounds"
                checked={settings.uiSounds}
                onChange={(event) => persistSettings({ ...settings, uiSounds: event.target.checked })}
                type="checkbox"
              />
              <span><strong>UI Sounds</strong><small>Click feedback and louder launcher notifications.</small></span>
            </label>
          </section>

          <section className="settings-card">
            <h2>System</h2>
            {systemStatus ? (
              <dl className="system-list">
                <div><dt>Steam</dt><dd>{systemStatus.steamRunning ? "Running" : systemStatus.steamFound ? "Closed" : "Not detected"}</dd></div>
                <div><dt>Steam Name</dt><dd>{systemStatus.steamPersonaName ?? "--"}</dd></div>
                <div><dt>DayZ</dt><dd>{systemStatus.dayzFound ? "Installed" : "Not installed"}</dd></div>
                <div><dt>Steam Path</dt><dd>{systemStatus.steamPath ?? "--"}</dd></div>
                <div><dt>DayZ Path</dt><dd>{systemStatus.dayzPath ?? "--"}</dd></div>
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

  if (!systemStatus) {
    return <div className="steam-gate-shell"><div className="steam-gate-card">Checking Steam...</div></div>;
  }

  if (!systemStatus.steamRunning) {
    return (
      <div className="steam-gate-shell">
        <div className="steam-gate-card">
          <div className="steam-gate-brand">
            <img alt="Monarch logo" src="/LogoWhite.svg" />
            <img alt="Monarch" src="/onarch.svg" />
          </div>
          <h1>Steam Required</h1>
          <p>Monarch Launcher requires Steam to be running before servers, mods, or DayZ launch features can be used.</p>
          {steamError ? <div className="steam-gate-error">{steamError}</div> : null}
          <button
            className="join-button steam-open-button"
            disabled={!systemStatus.steamFound || openingSteam}
            onClick={() => void openSteam()}
            type="button"
          >
            {openingSteam ? "OPENING..." : "OPEN STEAM"}
          </button>
          {!systemStatus.steamFound ? <small>Steam was not detected on this PC.</small> : <small>Monarch will unlock automatically when Steam is running.</small>}
        </div>
      </div>
    );
  }

  return (
    <div className="launcher-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" alt="Monarch logo" src="/LogoWhite.svg" />
          <div className="brand-wordmark-wrap">
            <img className="brand-wordmark" alt="Monarch" src="/onarch.svg" />
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

      {joinTarget ? (
        <ServerJoinDialog
          error={joinError}
          joining={joiningId === serverIdentity(joinTarget)}
          loading={joinLoading}
          onClose={closeJoinDialog}
          onJoin={() => void launchServer(joinTarget, joinTarget.isPassworded ? joinPassword : undefined)}
          onPasswordChange={setJoinPassword}
          onRefresh={() => void loadJoinRequiredMods(joinTarget)}
          onSync={() => void syncJoinRequiredMods()}
          password={joinPassword}
          requiredMods={joinRequiredMods}
          server={joinTarget}
          syncing={joinSyncing}
        />
      ) : null}
    </div>
  );
}
