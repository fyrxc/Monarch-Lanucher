"use client";

import type { ReactNode } from "react";
import { FaArrowLeft } from "react-icons/fa6";
import styles from "./monarch-drawer.module.css";

export function MonarchDrawer({
  open,
  label,
  onClose,
  children,
}: {
  open: boolean;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className={open ? `${styles.layer} ${styles.open}` : styles.layer} aria-hidden={!open}>
      <button aria-label={`Close ${label}`} className={styles.scrim} onClick={onClose} type="button" />
      <aside aria-label={label} aria-modal="true" className={styles.drawer} role="dialog">
        <button aria-label={`Back from ${label}`} className={styles.back} onClick={onClose} type="button">
          <FaArrowLeft aria-hidden="true" />
        </button>
        <div className={styles.body}>{children}</div>
      </aside>
    </div>
  );
}
