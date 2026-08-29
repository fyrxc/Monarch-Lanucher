"use client";

import { FaTrashCan } from "react-icons/fa6";
import { RxUpdate } from "react-icons/rx";
import { VscFiles } from "react-icons/vsc";
import type { InstalledMod, WorkshopDownloadProgress } from "../lib/models";
import { MonarchDrawer } from "./monarch-drawer";
import { MonarchModPreview } from "./monarch-mod-preview";
import styles from "./monarch-mod-info.module.css";

function formatBytes(value: number | null | undefined): string {
  if (!value || value <= 0) return "--";
  const units = ["B", "KB", "MB", "GB"];
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount >= 10 || unit === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[unit]}`;
}

function progressPercent(progress: WorkshopDownloadProgress | null): number | null {
  if (!progress) return null;
  if (progress.totalBytes > 0) {
    return Math.max(0, Math.min(100, Math.round((progress.downloadedBytes / progress.totalBytes) * 100)));
  }
  return progress.isInstalled && !progress.needsUpdate ? 100 : null;
}

function stateLabel(mod: InstalledMod, progress: WorkshopDownloadProgress | null): string {
  if (progress?.isDownloading || mod.isDownloading) return "Downloading";
  if (progress?.needsUpdate || mod.needsUpdate) return "Update Pending";
  if (progress?.isInstalled || mod.isSubscribed) return "Installed";
  return "Not Installed";
}

export function MonarchModInfo({
  mod,
  progress,
  busyAction,
  onClose,
  onUpdate,
  onOpenFolder,
  onUninstall,
}: {
  mod: InstalledMod | null;
  progress: WorkshopDownloadProgress | null;
  busyAction: "update" | "folder" | "uninstall" | null;
  onClose: () => void;
  onUpdate: (mod: InstalledMod) => void;
  onOpenFolder: (mod: InstalledMod) => void;
  onUninstall: (mod: InstalledMod) => void;
}) {
  if (!mod) return null;
  const percent = progressPercent(progress);
  const state = stateLabel(mod, progress);
  const steamUrl = `https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.workshopId}`;

  return (
    <MonarchDrawer label="Mod Info" onClose={onClose} open={Boolean(mod)}>
      <div className={styles.content}>
        <h2>{mod.name}</h2>
        <div className={styles.preview}>
          <MonarchModPreview alt={`${mod.name} Workshop preview`} src={mod.previewUrl} />
        </div>

        <div className={styles.info}>
          <div><span>Creator</span><strong>{mod.creator || "Unknown"}</strong></div>
          <div><span>Status</span><strong>{state}</strong></div>
          <div><span>Size</span><strong>{formatBytes(mod.fileSize)}</strong></div>
        </div>

        {(state === "Downloading" || state === "Update Pending") ? (
          <section aria-label="Mod download status" className={styles.download}>
            <div><span>{state}</span><strong>{percent === null ? "Waiting for Steam" : `${percent}%`}</strong></div>
            <div className={styles.track}><span style={{ width: `${percent ?? 3}%` }} /></div>
            {progress && progress.totalBytes > 0 ? (
              <small>{formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}</small>
            ) : null}
          </section>
        ) : null}

        <a className={styles.steamLink} href={steamUrl} rel="noreferrer" target="_blank">Steam Workshop</a>

        <div className={styles.actions}>
          <button aria-label="Update mod" disabled={busyAction !== null} onClick={() => onUpdate(mod)} type="button">
            <RxUpdate aria-hidden="true" />
          </button>
          <button aria-label="Open mod folder" disabled={busyAction !== null || !mod.path} onClick={() => onOpenFolder(mod)} type="button">
            <VscFiles aria-hidden="true" />
          </button>
          <button aria-label="Uninstall mod" disabled={busyAction !== null} onClick={() => onUninstall(mod)} type="button">
            <FaTrashCan aria-hidden="true" />
          </button>
        </div>
      </div>
    </MonarchDrawer>
  );
}
