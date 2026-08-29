"use client";

import { useState, type FormEvent } from "react";
import type { DayzServer } from "../lib/models";
import styles from "./password-dialog.module.css";

export function PasswordDialog({
  server,
  onJoin,
}: {
  server: DayzServer;
  onJoin: (password: string) => void;
}) {
  const [password, setPassword] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onJoin(password);
  }

  return (
    <div className={styles.layer}>
      <div className={styles.scrim} />
      <form
        aria-labelledby="server-password-title"
        aria-modal="true"
        className={styles.dialog}
        onSubmit={submit}
        role="dialog"
      >
        <div className={styles.heading} id="server-password-title">
          Server password
        </div>
        <p className={styles.serverName}>{server.name}</p>
        <label className={styles.label}>
          <span>Server password</span>
          <input
            aria-label="Server password"
            autoFocus
            className={styles.input}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        <button className={styles.joinButton} type="submit">
          JOIN SERVER
        </button>
      </form>
    </div>
  );
}
