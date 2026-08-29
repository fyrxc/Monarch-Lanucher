"use client";

import { useEffect, useMemo, useState } from "react";
import type { LauncherApi } from "../lib/api";
import type { InstalledMod, WorkshopDownloadProgress } from "../lib/models";
import { MonarchConfirm } from "./monarch-confirm";
import { MonarchModCard } from "./monarch-mod-card";
import { MonarchModInfo } from "./monarch-mod-info";
import styles from "./monarch-mods.module.css";

const LIST_REFRESH_MS = 2500;
const PROGRESS_REFRESH_MS = 1000;
type ModAction = "update" | "uninstall" | "folder";

type ModsApi = Pick<
  LauncherApi,
  | "getInstalledMods"
  | "updateWorkshopMod"
  | "unsubscribeWorkshopMod"
  | "openModFolder"
  | "getWorkshopDownloadProgress"
>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function percentFor(progress: WorkshopDownloadProgress | undefined): number | null {
  if (!progress) return null;
  if (progress.totalBytes > 0) {
    return Math.max(0, Math.min(100, Math.round((progress.downloadedBytes / progress.totalBytes) * 100)));
  }
  return progress.isInstalled && !progress.needsUpdate ? 100 : null;
}

function formatBytes(value: number): string {
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount >= 10 || unit === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[unit]}`;
}

export function MonarchMods({
  api,
  mods,
  loading,
  onRefresh,
  onChange,
  onMessage,
  onError,
}: {
  api: ModsApi;
  mods: InstalledMod[];
  loading: boolean;
  onRefresh: () => void;
  onChange: (mods: InstalledMod[]) => void;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingUninstallId, setPendingUninstallId] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ id: string; action: ModAction } | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(() =>
    new Set(mods.filter((mod) => mod.isDownloading || mod.needsUpdate).map((mod) => mod.workshopId)),
  );
  const [progress, setProgress] = useState<Record<string, WorkshopDownloadProgress>>({});

  const selectedMod = useMemo(
    () => mods.find((mod) => mod.workshopId === selectedId) ?? null,
    [mods, selectedId],
  );
  const pendingUninstall = useMemo(
    () => mods.find((mod) => mod.workshopId === pendingUninstallId) ?? null,
    [mods, pendingUninstallId],
  );
  const visibleMods = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return mods;
    return mods.filter(
      (mod) =>
        mod.name.toLocaleLowerCase().includes(query) ||
        mod.workshopId.toLocaleLowerCase().includes(query),
    );
  }, [mods, search]);

  useEffect(() => {
    const active = mods
      .filter((mod) => mod.isDownloading || mod.needsUpdate)
      .map((mod) => mod.workshopId);
    if (active.length === 0) return;
    setUpdatingIds((current) => {
      const next = new Set(current);
      active.forEach((id) => next.add(id));
      return next;
    });
  }, [mods]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const next = await api.getInstalledMods();
        if (!cancelled) onChange(next);
      } catch (error) {
        if (!cancelled) onError(errorMessage(error));
      }
    };
    const timer = window.setInterval(() => void refresh(), LIST_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [api, onChange, onError]);

  useEffect(() => {
    if (updatingIds.size === 0) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const ids = Array.from(updatingIds);
        const next = await api.getWorkshopDownloadProgress(ids);
        if (cancelled) return;
        const mapped: Record<string, WorkshopDownloadProgress> = {};
        const completed = new Set<string>();
        for (const item of next) {
          mapped[item.workshopId] = item;
          if (item.isInstalled && !item.isDownloading && !item.needsUpdate) completed.add(item.workshopId);
        }
        setProgress((current) => ({ ...current, ...mapped }));
        if (completed.size > 0) {
          const refreshed = await api.getInstalledMods();
          if (cancelled) return;
          onChange(refreshed);
          setUpdatingIds((current) => {
            const copy = new Set(current);
            completed.forEach((id) => copy.delete(id));
            return copy;
          });
        }
      } catch (error) {
        if (!cancelled) onError(errorMessage(error));
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), PROGRESS_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [api, onChange, onError, updatingIds]);

  const activeDownload = useMemo(() => {
    const ids = Array.from(updatingIds);
    if (ids.length === 0) return null;
    const items = ids.map((id) => progress[id]).filter(Boolean);
    const downloaded = items.reduce((sum, item) => sum + item.downloadedBytes, 0);
    const total = items.reduce((sum, item) => sum + item.totalBytes, 0);
    const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((downloaded / total) * 100))) : null;
    const first = mods.find((mod) => mod.workshopId === ids[0]);
    return { name: first?.name ?? "Steam Workshop", downloaded, total, percent };
  }, [mods, progress, updatingIds]);

  async function update(mod: InstalledMod) {
    setBusy({ id: mod.workshopId, action: "update" });
    try {
      await api.updateWorkshopMod(mod.workshopId);
      setUpdatingIds((current) => new Set(current).add(mod.workshopId));
      onChange(mods.map((item) => item.workshopId === mod.workshopId ? { ...item, isDownloading: true } : item));
      onMessage(`Steam is checking/downloading ${mod.name}.`);
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function openFolder(mod: InstalledMod) {
    setBusy({ id: mod.workshopId, action: "folder" });
    try {
      await api.openModFolder(mod.workshopId);
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function uninstall(mod: InstalledMod) {
    setBusy({ id: mod.workshopId, action: "uninstall" });
    try {
      await api.unsubscribeWorkshopMod(mod.workshopId);
      const refreshed = await api.getInstalledMods();
      onChange(refreshed.filter((item) => item.workshopId !== mod.workshopId));
      setSelectedId((current) => current === mod.workshopId ? null : current);
      setPendingUninstallId(null);
      onMessage(`Unsubscribed ${mod.name} through Steam.`);
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.view}>
      <div className={styles.toolbar}>
        <input
          aria-label="Search installed mods"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search"
          role="searchbox"
          value={search}
        />
        {activeDownload ? (
          <div aria-label="Mod download status" className={styles.download} role="status">
            <span className={styles.downloadName}>{activeDownload.name}</span>
            <div className={styles.track}><span style={{ width: `${activeDownload.percent ?? 3}%` }} /></div>
            <strong>{activeDownload.percent === null ? "Steam" : `${activeDownload.percent}%`}</strong>
            <small>{activeDownload.total > 0 ? `${formatBytes(activeDownload.downloaded)}/${formatBytes(activeDownload.total)}` : "Waiting for Steam"}</small>
          </div>
        ) : null}
      </div>

      <div className={styles.grid} aria-label="Installed DayZ Workshop mods">
        {visibleMods.map((mod) => (
          <MonarchModCard
            key={mod.workshopId}
            mod={mod}
            onOpen={(item) => setSelectedId(item.workshopId)}
            progressPercent={percentFor(progress[mod.workshopId])}
            updating={updatingIds.has(mod.workshopId) || mod.isDownloading}
          />
        ))}
        {loading && mods.length === 0 ? <div className={styles.loading}>Scanning Steam...</div> : null}
        {!loading && mods.length === 0 ? <div className={styles.loading}>No DayZ Workshop mods detected.</div> : null}
        {mods.length > 0 && visibleMods.length === 0 ? <div className={styles.loading}>No mods match your search.</div> : null}
      </div>

      <MonarchModInfo
        busyAction={selectedMod && busy?.id === selectedMod.workshopId ? busy.action : null}
        mod={selectedMod}
        onClose={() => setSelectedId(null)}
        onOpenFolder={(item) => void openFolder(item)}
        onUninstall={(item) => setPendingUninstallId(item.workshopId)}
        onUpdate={(item) => void update(item)}
        progress={selectedMod ? progress[selectedMod.workshopId] ?? null : null}
      />

      <MonarchConfirm
        busy={Boolean(pendingUninstall && busy?.id === pendingUninstall.workshopId && busy.action === "uninstall")}
        confirmLabel="UNINSTALL"
        onCancel={() => setPendingUninstallId(null)}
        onConfirm={() => pendingUninstall && void uninstall(pendingUninstall)}
        open={Boolean(pendingUninstall)}
        title="Uninstall mod"
      >
        {pendingUninstall ? `Uninstall ${pendingUninstall.name}? Steam will unsubscribe this Workshop item.` : null}
      </MonarchConfirm>

      <button aria-label="Refresh mods" className={styles.hiddenRefresh} disabled={loading} onClick={onRefresh} type="button">Refresh</button>
    </div>
  );
}
