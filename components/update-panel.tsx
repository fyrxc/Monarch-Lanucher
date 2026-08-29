"use client";

import { useState } from "react";
import { RxUpdate } from "react-icons/rx";
import type { LauncherApi } from "../lib/api";
import type { UpdateInfo } from "../lib/models";
import styles from "./update-panel.module.css";

type UpdateApi = Pick<LauncherApi, "checkForUpdate" | "installUpdate">;
type UpdateState = "idle" | "checking" | "up-to-date" | "available" | "installing" | "error";

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function UpdatePanel({ api }: { api: UpdateApi }) {
  const [state, setState] = useState<UpdateState>("idle");
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkForUpdate() {
    setState("checking");
    setError(null);
    try {
      const result = await api.checkForUpdate();
      setInfo(result);
      setState(result.available ? "available" : "up-to-date");
    } catch (nextError) {
      setError(errorMessage(nextError));
      setState("error");
    }
  }

  async function installUpdate() {
    setState("installing");
    setError(null);
    try {
      await api.installUpdate();
      setState("up-to-date");
    } catch (nextError) {
      setError(errorMessage(nextError));
      setState("error");
    }
  }

  return (
    <section className={`settings-card ${styles.card}`}>
      <div className={styles.heading}>
        <div>
          <h2>Launcher Updates</h2>
          <p>Checks GitHub Releases and only installs updates that pass Tauri signature verification.</p>
        </div>
        <button
          className="ghost-button icon-button"
          disabled={state === "checking" || state === "installing"}
          onClick={() => void checkForUpdate()}
          type="button"
        >
          <RxUpdate aria-hidden="true" />
          <span>{state === "checking" ? "Checking..." : "Check for Updates"}</span>
        </button>
      </div>

      {info ? (
        <div className={styles.versions}>
          <div className={styles.version}>
            <span>Current</span>
            <strong>{info.currentVersion}</strong>
          </div>
          <div className={styles.version}>
            <span>Latest</span>
            <strong>{info.latestVersion ?? info.currentVersion}</strong>
          </div>
        </div>
      ) : null}

      {state === "up-to-date" && info ? (
        <p className={styles.status}>Monarch Launcher is up to date.</p>
      ) : null}

      {state === "available" && info ? (
        <div className={styles.available}>
          <p className={styles.status}>A signed update is ready to install.</p>
          {info.notes ? <p className={styles.notes}>{info.notes}</p> : null}
          <button className="join-button icon-button" onClick={() => void installUpdate()} type="button">
            <RxUpdate aria-hidden="true" />
            <span>Install Update</span>
          </button>
        </div>
      ) : null}

      {state === "installing" ? (
        <p className={styles.status}>Downloading and verifying update...</p>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  );
}
