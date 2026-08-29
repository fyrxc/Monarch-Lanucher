import { FaTrashCan } from "react-icons/fa6";
import { RxUpdate } from "react-icons/rx";
import { VscFiles } from "react-icons/vsc";
import type { InstalledMod } from "../lib/models";
import styles from "./mod-card.module.css";
import { ModPreview } from "./mod-preview";

interface ModCardProps {
  mod: InstalledMod;
  busyAction: "update" | "uninstall" | "folder" | null;
  progressPercent?: number | null;
  onDetails(mod: InstalledMod): void;
  onOpenFolder(mod: InstalledMod): void;
  onUpdate(mod: InstalledMod): void;
  onUninstall(mod: InstalledMod): void;
}

function stateLabel(mod: InstalledMod, busyAction: ModCardProps["busyAction"]): string | null {
  if (busyAction === "update" || mod.isDownloading) return "Updating";
  if (mod.needsUpdate) return "Update available";
  return null;
}

export function ModCard({
  mod,
  busyAction,
  progressPercent = null,
  onDetails,
  onOpenFolder,
  onUpdate,
  onUninstall,
}: ModCardProps) {
  const commandBusy = busyAction === "folder" || busyAction === "uninstall";
  const status = stateLabel(mod, busyAction);

  return (
    <article className={styles.card}>
      <button
        aria-label={`Open ${mod.name} details`}
        className={styles.previewButton}
        onClick={() => onDetails(mod)}
        type="button"
      >
        <div className={styles.previewWrap}>
          <ModPreview
            fallbackClassName={styles.previewFallback}
            imageClassName={styles.preview}
            previewUrl={mod.previewUrl}
          />
          {progressPercent !== null ? (
            <div className={styles.progressTrack} aria-hidden="true">
              <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
            </div>
          ) : null}
        </div>
      </button>

      <div className={styles.footer}>
        <button className={styles.nameButton} onClick={() => onDetails(mod)} type="button">
          <strong title={mod.name}>{mod.name}</strong>
          {status ? <span>{progressPercent !== null ? `${status} ${progressPercent}%` : status}</span> : null}
        </button>
        <div className={styles.actions}>
          <button
            aria-label={`Open ${mod.name} folder`}
            disabled={commandBusy}
            onClick={() => onOpenFolder(mod)}
            title="Open folder"
            type="button"
          >
            <VscFiles aria-hidden="true" />
          </button>
          <button
            aria-label={`Update ${mod.name}`}
            disabled={busyAction !== null || mod.isDownloading}
            onClick={() => onUpdate(mod)}
            title="Check / update"
            type="button"
          >
            <RxUpdate aria-hidden="true" />
          </button>
          <button
            aria-label={`Uninstall ${mod.name}`}
            disabled={commandBusy}
            onClick={() => onUninstall(mod)}
            title="Uninstall"
            type="button"
          >
            <FaTrashCan aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
