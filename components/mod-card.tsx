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
        className={styles.detailsButton}
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
        <strong className={styles.modName}>{mod.name}</strong>
      </button>

      <div className={styles.actions}>
        <button
          aria-label={`Open ${mod.name} files`}
          className={styles.secondaryButton}
          disabled={busy}
          onClick={() => onOpenFolder(mod)}
          title="Open files"
          type="button"
        >
          <VscFiles aria-hidden="true" />
        </button>
        <button
          aria-label={`Check ${mod.name} for update`}
          className={styles.primaryButton}
          disabled={busy || mod.isDownloading}
          onClick={() => onUpdate(mod)}
          title="Check for update"
          type="button"
        >
          <RxUpdate aria-hidden="true" />
        </button>
        <button
          aria-label={`Uninstall ${mod.name}`}
          className={styles.dangerButton}
          disabled={busy}
          onClick={() => onUninstall(mod)}
          title="Uninstall"
          type="button"
        >
          <FaTrashCan aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
