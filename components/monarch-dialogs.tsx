"use client";

import { useState } from "react";
import type { DayzServer } from "../lib/models";
import styles from "./monarch-dialogs.module.css";

function DialogFrame({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.layer}>
      <section aria-label={label} aria-modal="true" className={styles.dialog} role="dialog">
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}

export function MonarchDayzRunningDialog({
  server,
  busy,
  onCancel,
  onCloseAndJoin,
}: {
  server: DayzServer;
  busy: boolean;
  onCancel: () => void;
  onCloseAndJoin: () => void;
}) {
  return (
    <DialogFrame label="DayZ is open" title="DayZ is open">
      <p>Would you like Monarch to close DayZ and join {server.name}?</p>
      <div className={styles.actions}>
        <button disabled={busy} onClick={onCancel} type="button">CANCEL</button>
        <button disabled={busy} onClick={onCloseAndJoin} type="button">{busy ? "CLOSING..." : "CLOSE DAYZ"}</button>
      </div>
    </DialogFrame>
  );
}

export function MonarchPasswordDialog({
  server,
  onCancel,
  onJoin,
}: {
  server: DayzServer;
  onCancel: () => void;
  onJoin: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  return (
    <DialogFrame label="Server password" title="Server password">
      <p>{server.name} requires a password.</p>
      <input
        aria-label="Server password input"
        autoFocus
        className={styles.input}
        onChange={(event) => setPassword(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && password) onJoin(password);
        }}
        type="password"
        value={password}
      />
      <div className={styles.actions}>
        <button onClick={onCancel} type="button">CANCEL</button>
        <button disabled={!password} onClick={() => onJoin(password)} type="button">JOIN</button>
      </div>
    </DialogFrame>
  );
}

function formatBytes(value: number): string {
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount >= 10 || unit === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[unit]}`;
}

export function MonarchSetupModsDialog({
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
  return (
    <DialogFrame label="Setup required mods" title={ready ? "Mods ready" : "Required mods"}>
      {ready ? (
        <p>Ready — press Join again.</p>
      ) : (
        <>
          <p>{server.name} requires {missingWorkshopIds.length} missing or updating Workshop mod{missingWorkshopIds.length === 1 ? "" : "s"}.</p>
          {progressPercent !== null ? (
            <div className={styles.download} aria-label="Required mod download progress">
              <div><span>Steam Download</span><strong>{progressPercent}%</strong></div>
              <div className={styles.track}><span style={{ width: `${progressPercent}%` }} /></div>
              {totalBytes > 0 ? <small>{formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}</small> : <small>Waiting for Steam</small>}
            </div>
          ) : null}
        </>
      )}
      <div className={styles.actions}>
        <button disabled={busy !== null} onClick={onClose} type="button">CLOSE</button>
        {!ready ? <button disabled={busy !== null} onClick={onCheck} type="button">{busy === "check" ? "CHECKING..." : "CHECK"}</button> : null}
        {!ready ? <button disabled={busy !== null || missingWorkshopIds.length === 0} onClick={onSetup} type="button">{busy === "setup" ? "STARTING..." : "SETUP MODS"}</button> : null}
      </div>
    </DialogFrame>
  );
}
