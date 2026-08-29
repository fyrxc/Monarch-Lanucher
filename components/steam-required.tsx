import { FaSteam } from "react-icons/fa";
import styles from "./steam-required.module.css";

export function SteamRequired({
  checking,
  onRetry,
}: {
  checking: boolean;
  onRetry: () => void;
}) {
  return (
    <div className={styles.layer}>
      <section aria-label="Steam required" aria-modal="true" className={styles.dialog} role="dialog">
        <FaSteam aria-hidden="true" className={styles.icon} />
        <h1>Steam Required</h1>
        <p>Steam must be open and signed in before Monarch can be used.</p>
        <button disabled={checking} onClick={onRetry} type="button">
          {checking ? "Checking Steam..." : "Retry Steam"}
        </button>
      </section>
    </div>
  );
}
