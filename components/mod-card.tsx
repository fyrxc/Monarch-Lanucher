import { FiExternalLink } from "react-icons/fi";
import type { InstalledMod } from "../lib/models";
import styles from "./mod-card.module.css";

interface ModCardProps {
  mod: InstalledMod;
  busyAction: "update" | "uninstall" | "folder" | null;
  onOpenFolder(mod: InstalledMod): void;
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
  onUpdate,
  onUninstall,
}: ModCardProps) {
  const busy = busyAction !== null;

  return (
    <article className={styles.card}>
      <div className={styles.previewWrap}>
        {mod.previewUrl ? (
          <img className={styles.preview} src={mod.previewUrl} alt="" loading="lazy" />
        ) : (
          <div className={styles.previewFallback} aria-hidden="true">
            M
          </div>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <strong>{mod.name}</strong>
            <span>Workshop ID {mod.workshopId}</span>
            <div className={styles.metadataLinks}>
              {mod.creatorId ? (
                mod.creatorUrl ? (
                  <a href={mod.creatorUrl} rel="noreferrer" target="_blank">
                    Creator {mod.creatorId}
                  </a>
                ) : (
                  <span>Creator {mod.creatorId}</span>
                )
              ) : (
                <span>Creator loading...</span>
              )}
              <a href={mod.workshopUrl} rel="noreferrer" target="_blank">
                STEAM WORKSHOP <FiExternalLink aria-hidden />
              </a>
            </div>
          </div>
          <span
            className={`${styles.state} ${mod.needsUpdate ? styles.stateUpdate : ""}`}
          >
            {stateLabel(mod)}
          </span>
        </div>

        <div className={styles.location}>
          <span>Folder location</span>
          <code title={mod.path}>{mod.path}</code>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.secondaryButton}
            disabled={busy}
            onClick={() => onOpenFolder(mod)}
            type="button"
          >
            {busyAction === "folder" ? "OPENING..." : "OPEN FOLDER"}
          </button>
          <button
            className={styles.primaryButton}
            disabled={busy || mod.isDownloading}
            onClick={() => onUpdate(mod)}
            type="button"
          >
            {busyAction === "update"
              ? "UPDATING..."
              : mod.needsUpdate
                ? "UPDATE"
                : "CHECK / UPDATE"}
          </button>
          <button
            className={styles.dangerButton}
            disabled={busy}
            onClick={() => onUninstall(mod)}
            type="button"
          >
            {busyAction === "uninstall" ? "UNINSTALLING..." : "UNINSTALL"}
          </button>
        </div>
      </div>
    </article>
  );
}
