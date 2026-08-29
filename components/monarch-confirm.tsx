"use client";

import type { ReactNode } from "react";
import styles from "./monarch-confirm.module.css";

export function MonarchConfirm({
  open,
  title,
  children,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className={styles.layer}>
      <section aria-label={title} aria-modal="true" className={styles.dialog} role="dialog">
        <h2>{title}</h2>
        <div className={styles.body}>{children}</div>
        <div className={styles.actions}>
          <button disabled={busy} onClick={onCancel} type="button">CANCEL</button>
          <button disabled={busy} onClick={onConfirm} type="button">{busy ? "WORKING..." : confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
