import type { ReactNode } from "react";
import styles from "./confirm-dialog.module.css";

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className={styles.layer}>
      <div className={styles.scrim} />
      <section aria-label={title} aria-modal="true" className={styles.dialog} role="dialog">
        <h2>{title}</h2>
        <div className={styles.copy}>{children}</div>
        <div className={styles.actions}>
          <button className={styles.secondary} disabled={busy} onClick={onCancel} type="button">
            CANCEL
          </button>
          <button className={styles.danger} disabled={busy} onClick={onConfirm} type="button">
            {busy ? "WORKING..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
