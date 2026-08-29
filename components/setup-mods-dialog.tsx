"use client";

import type { DayzServer } from "../lib/models";
import styles from "./setup-mods-dialog.module.css";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unit;
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

export function SetupModsDialog({
  server,
  missingWorkshopIds,
  ready,
  busy,
  progressPercent,
  downloadedBytes,
  totalBytes,
  onSetup,
  onCheck,
  onClose,
}: {
  server: DayzServer;
  missingWorkshopIds: string[];
  ready: boolean;
  busy: "setup" | "check" | null;
  progressPercent: number | null;
  downloadedBytes: number;
  totalBytes: number;
  onSetup: () => void;
  onCheck: () => void;
  onClose: () => void;
}) {
  const count = missingWorkshopIds.length;

  return (
    <div className={styles.layer}>
      <div className={styles.scrim} />
      <section
        aria-labelledby="setup-mods-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <div className={styles.heading} id="setup-mods-title">
          Setup Mods
        </div>
        <p className={styles.serverName}>{server.name}</p>

        {ready ? (
          <p className={styles.ready}>Ready — press Join again</p>
        ) : (
          <p className={styles.copy}>
            {count} required {count === 1 ? "mod" : "mods"} need to be installed. Monarch will
            subscribe and download them through your signed-in Steam client.
          </p>
        )}

        {!ready && progressPercent !== null ? (
          <div className={styles.progressBlock}>
            <div className={styles.progressMeta}>
              <strong>{progressPercent}%</strong>
              <span>
                {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
              </span>
            </div>
            <div
              aria-label="Workshop download progress"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progressPercent}
              className={styles.progressTrack}
              role="progressbar"
            >
              <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        ) : null}

        <div className={styles.actions}>
          {!ready ? (
            <>
              <button
                className={styles.primary}
                disabled={busy !== null || count === 0}
                onClick={onSetup}
                type="button"
              >
                {busy === "setup" ? "STARTING..." : "SETUP MODS"}
              </button>
              <button
                className={styles.secondary}
                disabled={busy !== null}
                onClick={onCheck}
                type="button"
              >
                {busy === "check" ? "CHECKING..." : "CHECK STATUS"}
              </button>
            </>
          ) : null}
          <button
            className={`${styles.secondary} ${styles.close}`}
            disabled={busy !== null}
            onClick={onClose}
            type="button"
          >
            CLOSE
          </button>
        </div>
      </section>
    </div>
  );
}
