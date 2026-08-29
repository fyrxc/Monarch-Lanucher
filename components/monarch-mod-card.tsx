import type { InstalledMod } from "../lib/models";
import { MonarchModPreview } from "./monarch-mod-preview";
import styles from "./monarch-mod-card.module.css";

export function MonarchModCard({
  mod,
  updating,
  progressPercent,
  onOpen,
}: {
  mod: InstalledMod;
  updating: boolean;
  progressPercent: number | null;
  onOpen: (mod: InstalledMod) => void;
}) {
  return (
    <button
      aria-label={`Open ${mod.name} details`}
      className={styles.card}
      onClick={() => onOpen(mod)}
      type="button"
    >
      <div className={styles.image}>
        <MonarchModPreview alt={`${mod.name} Workshop preview`} src={mod.previewUrl} />
        {updating ? (
          <div className={styles.progress} aria-label={`${mod.name} download progress`}>
            <span style={{ width: `${progressPercent ?? 3}%` }} />
          </div>
        ) : null}
      </div>
      <span className={styles.name}>{mod.name}</span>
      {updating ? <small>{progressPercent === null ? "Updating" : `${progressPercent}%`}</small> : null}
    </button>
  );
}
