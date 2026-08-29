import type { ReactNode } from "react";
import { FiSettings } from "react-icons/fi";
import { MonarchBrand } from "./monarch-brand";
import { MonarchNavigation, type LauncherView } from "./monarch-navigation";
import styles from "./monarch-shell.module.css";

export function MonarchShell({
  activeView,
  onSelectView,
  onOpenSettings,
  children,
  footer,
}: {
  activeView: LauncherView;
  onSelectView: (view: LauncherView) => void;
  onOpenSettings: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <MonarchBrand className={styles.brand} />
        <MonarchNavigation active={activeView} onSelect={onSelectView} />
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </aside>

      <main className={styles.main}>
        <div className={styles.topbar}>
          <button aria-label="Settings" className={styles.settings} onClick={onOpenSettings} type="button">
            <FiSettings aria-hidden="true" />
            <span>Settings</span>
          </button>
        </div>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
