import type { ReactNode } from "react";
import styles from "./monarch-status.module.css";

export function MonarchStatus({
  tone = "neutral",
  children,
  action,
}: {
  tone?: "neutral" | "warning" | "error" | "success";
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`${styles.status} ${styles[tone]}`} role={tone === "error" ? "alert" : "status"}>
      <span>{children}</span>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
