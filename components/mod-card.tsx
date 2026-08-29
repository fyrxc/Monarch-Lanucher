import { FaTrashCan } from "react-icons/fa6";
import { RxUpdate } from "react-icons/rx";
import { VscFiles } from "react-icons/vsc";
import type { InstalledMod } from "../lib/models";
import { MONARCH_LOGO_DATA_URI } from "../lib/ui-assets";
import styles from "./mod-card.module.css";

interface ModCardProps {
  mod: InstalledMod;
  busyAction: "update" | "uninstall" | "folder" | null;
  onOpenFolder(mod: InstalledMod): void;
  onSelect(mod: InstalledMod): void;
  onUpdate(mod: InstalledMod): void;
  onUninstall(mod: InstalledMod): void;
}

function stateLabel(mod: InstalledMod): string {
  if (mod.isDownloading) return "Downloading";
  if (mod.needsUpdate) return "Update available";
  if (!mod.isSubscribed) return "Installed locally";
  return "Installed";
}

export function ModCard({
  mod,
  busyAction,
  onOpenFolder,
  onSelect,
  onUpdate,
  onUninstall,
}: ModCardProps) {
  const busy = busyAction !== null;

  return (
    <article className={styles.card}>
      <button
        aria-label={`View details for ${mod.name}`}
        className={styles.previewButton}
        onClick={() => onSelect(mod)}
        type="button"
      >
        <div className={styles.previewWrap}>
          {mod.previewUrl ? (
            <img className={styles.preview} src={mod.previewUrl} alt="" loading="lazy" />
          ) : (
            <img
              alt=""
              className={`${styles.preview} ${styles.previewFallbackImage}`}
              data-testid="monarch-mod-fallback"
              src={MONARCH_LOGO_DATA_URI}
            />
          )}
          <span className={styles.previewOverlay}>View details</span>
        </div>
      </button>

      <div className={styles.content}>
        <button
          aria-label={`Open details for ${mod.name}`}
          className={styles.titleButton}
          onClick={() => onSelect(mod)}
          type="button"
        >
          <div className={styles.header}>
            <div className={styles.titleBlock}>
              <strong>{mod.name}</strong>
              <span>Workshop ID {mod.workshopId}</span>
            </div>
            <span
              className={`${styles.state} ${mod.needsUpdate ? styles.stateUpdate : ""}`}
            >
              {stateLabel(mod)}
            </span>
          </div>
        </button>

        <div className={styles.location}>
          <span>Folder location</span>
          <code title={mod.path}>{mod.path}</code>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.secondaryButton}
            disabled={busy}
            onClick={() => onOpenFolder(mod)}
            title="Open files"
            type="button"
          >
            <VscFiles aria-hidden="true" />
            <span>{busyAction === "folder" ? "OPENING..." : "OPEN FOLDER"}</span>
          </button>
          <button
            className={styles.primaryButton}
            disabled={busy || mod.isDownloading}
            onClick={() => onUpdate(mod)}
            title="Check for update"
            type="button"
          >
            <RxUpdate aria-hidden="true" />
            <span>
              {busyAction === "update"
                ? "UPDATING..."
                : mod.needsUpdate
                  ? "UPDATE"
                  : "CHECK / UPDATE"}
            </span>
          </button>
          <button
            className={styles.dangerButton}
            disabled={busy}
            onClick={() => onUninstall(mod)}
            title="Uninstall"
            type="button"
          >
            <FaTrashCan aria-hidden="true" />
            <span>{busyAction === "uninstall" ? "UNINSTALLING..." : "UNINSTALL"}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
