import type { DayzServer } from "../lib/models";
import styles from "./dayz-running-dialog.module.css";

export function DayzRunningDialog({
  server,
  busy,
  onCloseAndJoin,
  onCancel,
}: {
  server: DayzServer;
  busy: boolean;
  onCloseAndJoin: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={styles.layer}>
      <div className={styles.scrim} />
      <section
        aria-labelledby="dayz-running-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <div className={styles.heading} id="dayz-running-title">
          DayZ is already open
        </div>
        <p className={styles.copy}>
          Monarch needs to close the current DayZ session before joining {server.name}.
        </p>
        <div className={styles.actions}>
          <button className={styles.secondary} disabled={busy} onClick={onCancel} type="button">
            CANCEL
          </button>
          <button className={styles.primary} disabled={busy} onClick={onCloseAndJoin} type="button">
            {busy ? "CLOSING DAYZ..." : "CLOSE DAYZ & JOIN"}
          </button>
        </div>
      </section>
    </div>
  );
}
