"use client";

import { useEffect, useMemo, useState } from "react";
import type { LauncherApi } from "../lib/api";
import type { InstalledMod } from "../lib/models";
import { ConfirmDialog } from "./confirm-dialog";
import { ModCard } from "./mod-card";
import { ModInfoPanel } from "./mod-info-panel";
import styles from "./mods-view.module.css";

const PROGRESS_POLL_MS = 1500;
const MOD_LIST_REFRESH_MS = 5000;
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

export function ModsView({
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
    new Set(mods.filter((mod) => mod.isDownloading).map((mod) => mod.workshopId)),
  );
  const [progress, setProgress] = useState<Record<string, number | null>>({});

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
    const downloading = mods.filter((mod) => mod.isDownloading).map((mod) => mod.workshopId);
    if (downloading.length === 0) return;
    setUpdatingIds((current) => {
      const next = new Set(current);
      downloading.forEach((id) => next.add(id));
      return next;
    });
  }, [mods]);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;

    const refreshInstalled = async () => {
      try {
        const nextMods = await api.getInstalledMods();
        if (cancelled) return;
        onChange(nextMods);
        const downloading = nextMods
          .filter((mod) => mod.isDownloading)
          .map((mod) => mod.workshopId);
        if (downloading.length > 0) {
          setUpdatingIds((current) => {
            const next = new Set(current);
            downloading.forEach((id) => next.add(id));
            return next;
          });
        }
      } catch (error) {
        if (!cancelled) onError(errorMessage(error));
      }
    };

    void refreshInstalled();
    const timer = window.setInterval(() => void refreshInstalled(), MOD_LIST_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [api, loading, onChange, onError]);

  useEffect(() => {
    if (updatingIds.size === 0) return;
    let cancelled = false;

    const refresh = async () => {
      const ids = Array.from(updatingIds);
      try {
        const next = await api.getWorkshopDownloadProgress(ids);
        if (cancelled) return;

        const nextProgress: Record<string, number | null> = {};
        const completed = new Set<string>();
        for (const item of next) {
          const percent =
            item.totalBytes > 0
              ? Math.max(0, Math.min(100, Math.round((item.downloadedBytes / item.totalBytes) * 100)))
              : item.isInstalled && !item.needsUpdate
                ? 100
                : null;
          nextProgress[item.workshopId] = percent;
          if (item.isInstalled && !item.isDownloading && !item.needsUpdate) {
            completed.add(item.workshopId);
          }
        }
        setProgress((current) => ({ ...current, ...nextProgress }));

        if (completed.size > 0) {
          onChange(
            mods.map((mod) =>
              completed.has(mod.workshopId)
                ? { ...mod, needsUpdate: false, isDownloading: false }
                : mod,
            ),
          );
          setUpdatingIds((current) => {
            const nextIds = new Set(current);
            completed.forEach((id) => nextIds.delete(id));
            return nextIds;
          });
          completed.forEach((id) => {
            const mod = mods.find((item) => item.workshopId === id);
            if (mod) onMessage(`${mod.name} is up to date.`);
          });
        }
      } catch (error) {
        if (!cancelled) onError(errorMessage(error));
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), PROGRESS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [api, mods, onChange, onError, onMessage, updatingIds]);

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

  async function update(mod: InstalledMod) {
    setBusy({ id: mod.workshopId, action: "update" });
    try {
      await api.updateWorkshopMod(mod.workshopId);
      setUpdatingIds((current) => new Set(current).add(mod.workshopId));
      onChange(
        mods.map((item) =>
          item.workshopId === mod.workshopId ? { ...item, isDownloading: true } : item,
        ),
      );
      onMessage(`Steam is checking/downloading ${mod.name}.`);
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
      onChange(mods.filter((item) => item.workshopId !== mod.workshopId));
      setSelectedId((current) => (current === mod.workshopId ? null : current));
      setPendingUninstallId(null);
      onMessage(`Unsubscribed ${mod.name} through Steam.`);
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className={styles.toolbar}>
        <div>
          <h1>Mods</h1>
          <p>Steam Workshop mods already installed for DayZ.</p>
        </div>
        <div className={styles.toolbarActions}>
          <input
            aria-label="Search installed mods"
            className={styles.search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search installed mods"
            role="searchbox"
            value={search}
          />
          <button className="ghost-button" disabled={loading} onClick={onRefresh} type="button">
            {loading ? "Scanning..." : "Refresh"}
          </button>
        </div>
      </div>

      {loading && mods.length === 0 ? (
        <div className="loading-state">Loading Steam Workshop mods...</div>
      ) : mods.length === 0 ? (
        <div className="empty-state">No installed DayZ Workshop mods were detected.</div>
      ) : visibleMods.length === 0 ? (
        <div className="empty-state">No installed mods match your search.</div>
      ) : (
        <div className={styles.grid} aria-label="Installed DayZ Workshop mods">
          {visibleMods.map((mod) => {
            const activeBusy =
              busy?.id === mod.workshopId
                ? busy.action
                : updatingIds.has(mod.workshopId)
                  ? "update"
                  : null;
            return (
              <ModCard
                busyAction={activeBusy}
                key={mod.workshopId}
                mod={mod}
                onDetails={(item) => setSelectedId(item.workshopId)}
                onOpenFolder={(item) => void openFolder(item)}
                onUninstall={(item) => setPendingUninstallId(item.workshopId)}
                onUpdate={(item) => void update(item)}
                progressPercent={progress[mod.workshopId] ?? null}
              />
            );
          })}
        </div>
      )}

      <ModInfoPanel
        busyAction={
          selectedMod && busy?.id === selectedMod.workshopId
            ? busy.action
            : selectedMod && updatingIds.has(selectedMod.workshopId)
              ? "update"
              : null
        }
        mod={selectedMod}
        onClose={() => setSelectedId(null)}
        onOpenFolder={(item) => void openFolder(item)}
        onUninstall={(item) => setPendingUninstallId(item.workshopId)}
        onUpdate={(item) => void update(item)}
        progressPercent={selectedMod ? progress[selectedMod.workshopId] ?? null : null}
      />

      {pendingUninstall ? (
        <ConfirmDialog
          busy={busy?.id === pendingUninstall.workshopId && busy.action === "uninstall"}
          confirmLabel="UNINSTALL"
          onCancel={() => setPendingUninstallId(null)}
          onConfirm={() => void uninstall(pendingUninstall)}
          title="Uninstall mod"
        >
          Uninstall {pendingUninstall.name}? Steam will unsubscribe it and remove the Workshop item.
        </ConfirmDialog>
      ) : null}
    </>
  );
}
