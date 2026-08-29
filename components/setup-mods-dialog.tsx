"use client";

import type { DayzServer } from "../lib/models";
import styles from "./setup-mods-dialog.module.css";

export function SetupModsDialog({
  server,
  missingWorkshopIds,
  ready,
  busy,
  onSetup,
  onCheck,
  onClose,
}: {
  server: DayzServer;
  missingWorkshopIds: string[];
  ready: boolean;
  busy: "setup" | "check" | null;
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
