import type { InstalledMod } from "../lib/models";
import { ModPreview } from "./mod-preview";
import styles from "./mod-card.module.css";

interface ModCardProps {
  mod: InstalledMod;
  updating: boolean;
  progressPercent?: number | null;
  onDetails(mod: InstalledMod): void;
}

export function ModCard({
  mod,
  updating,
  progressPercent = null,
  onDetails,
}: ModCardProps) {
  const status = updating || mod.isDownloading
    ? progressPercent !== null
      ? `Downloading ${progressPercent}%`
      : "Downloading"
    : mod.needsUpdate
      ? "Update available"
      : null;

  return (
    <button
      aria-label={`Open ${mod.name} details`}
      className={styles.card}
      onClick={() => onDetails(mod)}
      type="button"
    >
      <div className={styles.previewWrap}>
        <ModPreview
          fallbackClassName={styles.previewFallback}
          imageClassName={styles.preview}
          previewUrl={mod.previewUrl}
        />
        {updating || mod.isDownloading ? (
          <div className={styles.downloadOverlay}>
            <span>{progressPercent !== null ? `${progressPercent}%` : "..."}</span>
          </div>
        ) : null}
        {progressPercent !== null ? (
          <div className={styles.progressTrack} aria-hidden="true">
            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
          </div>
        ) : null}
      </div>
      <div className={styles.caption}>
        <strong title={mod.name}>{mod.name}</strong>
        {status ? <span>{status}</span> : null}
      </div>
    </button>
  );
}
