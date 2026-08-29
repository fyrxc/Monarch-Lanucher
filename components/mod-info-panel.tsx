import { FaTrashCan } from "react-icons/fa6";
import { RxUpdate } from "react-icons/rx";
import { VscFiles } from "react-icons/vsc";
import type { InstalledMod, WorkshopDownloadProgress } from "../lib/models";
import { ModPreview } from "./mod-preview";
import { SlidePanel } from "./slide-panel";
import styles from "./mod-info-panel.module.css";

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes < 0) return "Unknown";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit >= 3 ? 2 : unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatUpdated(timestamp: number | null | undefined): string {
  if (!timestamp) return "Unknown";
  return new Date(timestamp * 1000).toLocaleDateString();
}

function progressPercent(progress: WorkshopDownloadProgress | null): number | null {
  if (!progress) return null;
  if (progress.totalBytes > 0) {
    return Math.max(
      0,
      Math.min(100, Math.round((progress.downloadedBytes / progress.totalBytes) * 100)),
    );
  }
  return progress.isInstalled && !progress.needsUpdate ? 100 : null;
}

export function ModInfoPanel({
  mod,
  busyAction,
  progress,
  onClose,
  onOpenFolder,
  onUpdate,
  onUninstall,
}: {
  mod: InstalledMod | null;
  busyAction: "update" | "uninstall" | "folder" | null;
  progress: WorkshopDownloadProgress | null;
  onClose: () => void;
  onOpenFolder: (mod: InstalledMod) => void;
  onUpdate: (mod: InstalledMod) => void;
  onUninstall: (mod: InstalledMod) => void;
}) {
  const commandBusy = busyAction === "folder" || busyAction === "uninstall";
  const percent = progressPercent(progress);
  const showingUpdate = Boolean(
    mod && (busyAction === "update" || mod.isDownloading || progress?.isDownloading),
  );

  return (
    <SlidePanel open={mod !== null} title="Mod Info" onClose={onClose}>
      {mod ? (
        <div className={styles.content}>
          <div className={styles.identity}>
            <div className={styles.previewWrap}>
              <ModPreview
                fallbackClassName={styles.previewFallback}
                imageClassName={styles.preview}
                previewUrl={mod.previewUrl}
              />
            </div>
            <div className={styles.titleBlock}>
              <h3>{mod.name}</h3>
              <p className={styles.workshopId}>Workshop ID {mod.workshopId}</p>
              <a
                aria-label="Steam Workshop"
                className={styles.steamLink}
                href={`https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.workshopId}`}
                rel="noreferrer"
                target="_blank"
              >
                OPEN IN STEAM WORKSHOP
              </a>
            </div>
          </div>

          {showingUpdate ? (
            <div className={styles.progress} role="status" aria-label="Mod download status">
              <div className={styles.progressHeader}>
                <span>Downloading / Updating</span>
                <strong>{percent !== null ? `${percent}%` : "Waiting for Steam"}</strong>
              </div>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${percent ?? 2}%` }} />
              </div>
              <div className={styles.progressBytes}>
                <span>{formatBytes(progress?.downloadedBytes ?? 0)}</span>
                <span>{progress?.totalBytes ? formatBytes(progress.totalBytes) : "Total pending"}</span>
              </div>
            </div>
          ) : null}

          <div className={styles.metaGrid}>
            <div>
              <span>Size</span>
              <strong>{formatBytes(mod.fileSize)}</strong>
            </div>
            <div>
              <span>Updated</span>
              <strong>{formatUpdated(mod.timeUpdated)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>
                {showingUpdate ? "Downloading" : mod.needsUpdate ? "Update Available" : "Installed"}
              </strong>
            </div>
          </div>

          <section className={styles.description}>
            <h4>Mod Description</h4>
            <p>{mod.description?.trim() || "No Workshop description was provided."}</p>
          </section>

          <div className={styles.actions}>
            <button
              aria-label="Open mod folder"
              disabled={commandBusy}
              onClick={() => onOpenFolder(mod)}
              type="button"
            >
              <VscFiles aria-hidden="true" />
              Folder
            </button>
            <button
              aria-label="Update mod"
              disabled={busyAction !== null || mod.isDownloading}
              onClick={() => onUpdate(mod)}
              type="button"
            >
              <RxUpdate aria-hidden="true" />
              Update
            </button>
            <button
              aria-label="Uninstall mod"
              disabled={commandBusy}
              onClick={() => onUninstall(mod)}
              type="button"
            >
              <FaTrashCan aria-hidden="true" />
              Uninstall
            </button>
          </div>
        </div>
      ) : null}
    </SlidePanel>
  );
}
