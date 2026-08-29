import { FaTrashCan } from "react-icons/fa6";
import { RxUpdate } from "react-icons/rx";
import { VscFiles } from "react-icons/vsc";
import type { InstalledMod } from "../lib/models";
import { SlidePanel } from "./slide-panel";
import { ModPreview } from "./mod-preview";
import styles from "./mod-info-panel.module.css";

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "Unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit >= 3 ? 2 : 1)} ${units[unit]}`;
}

function formatUpdated(timestamp: number | null | undefined): string {
  if (!timestamp) return "Unknown";
  return new Date(timestamp * 1000).toLocaleDateString();
}

export function ModInfoPanel({
  mod,
  busyAction,
  progressPercent,
  onClose,
  onOpenFolder,
  onUpdate,
  onUninstall,
}: {
  mod: InstalledMod | null;
  busyAction: "update" | "uninstall" | "folder" | null;
  progressPercent: number | null;
  onClose: () => void;
  onOpenFolder: (mod: InstalledMod) => void;
  onUpdate: (mod: InstalledMod) => void;
  onUninstall: (mod: InstalledMod) => void;
}) {
  const commandBusy = busyAction === "folder" || busyAction === "uninstall";

  return (
    <SlidePanel open={mod !== null} title="Mod Info" onClose={onClose}>
      {mod ? (
        <div className={styles.content}>
          <div className={styles.previewWrap}>
            <ModPreview
              fallbackClassName={styles.previewFallback}
              imageClassName={styles.preview}
              previewUrl={mod.previewUrl}
            />
          </div>

          <div>
            <h3>{mod.name}</h3>
            <p className={styles.workshopId}>Workshop ID {mod.workshopId}</p>
          </div>

          {progressPercent !== null ? (
            <div className={styles.progress}>
              <div className={styles.progressHeader}>
                <span>Updating</span>
                <strong>{progressPercent}%</strong>
              </div>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${progressPercent}%` }} />
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
          </div>

          <section className={styles.description}>
            <h4>Mod Description</h4>
            <p>{mod.description?.trim() || "No Workshop description was provided."}</p>
          </section>

          <a
            className={styles.steamLink}
            href={`https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.workshopId}`}
            rel="noreferrer"
            target="_blank"
          >
            Steam Workshop
          </a>

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
