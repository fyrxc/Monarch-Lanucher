import type { ReactNode } from "react";

export function StatusBanner({
  tone = "info",
  children,
  action,
}: {
  tone?: "info" | "warning" | "error" | "success";
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`status-banner ${tone}`}>
      <span>{children}</span>
      {action}
    </div>
  );
}
