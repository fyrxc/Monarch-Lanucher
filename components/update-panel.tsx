"use client";

import { useState } from "react";
import type { LauncherApi } from "../lib/api";
import type { UpdateInfo } from "../lib/models";

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
    <section className="settings-card update-card">
      <div className="update-card-heading">
        <div>
          <h2>Launcher Updates</h2>
          <p>Checks GitHub Releases and only installs updates that pass Tauri signature verification.</p>
        </div>
        <button
          className="ghost-button"
          disabled={state === "checking" || state === "installing"}
          onClick={() => void checkForUpdate()}
          type="button"
        >
          {state === "checking" ? "Checking..." : "Check for Updates"}
        </button>
      </div>

      {info ? (
        <div className="update-version-grid">
          <div>
            <span>Current</span>
            <strong>{info.currentVersion}</strong>
          </div>
          <div>
            <span>Latest</span>
            <strong>{info.latestVersion ?? info.currentVersion}</strong>
          </div>
        </div>
      ) : null}

      {state === "up-to-date" && info ? (
        <p className="update-status">Monarch Launcher is up to date.</p>
      ) : null}

      {state === "available" && info ? (
        <div className="update-available">
          <p className="update-status">A signed update is ready to install.</p>
          {info.notes ? <p className="update-notes">{info.notes}</p> : null}
          <button className="join-button" onClick={() => void installUpdate()} type="button">
            Install Update
          </button>
        </div>
      ) : null}

      {state === "installing" ? (
        <p className="update-status">Downloading and verifying update...</p>
      ) : null}

      {error ? <p className="update-error">{error}</p> : null}
    </section>
  );
}
