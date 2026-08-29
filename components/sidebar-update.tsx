"use client";

import { useState } from "react";
import { RxUpdate } from "react-icons/rx";
import type { LauncherApi } from "../lib/api";
import styles from "./sidebar-update.module.css";

type UpdateApi = Pick<LauncherApi, "checkForUpdate" | "installUpdate">;

type State = "idle" | "checking" | "current" | "available" | "installing" | "error";

export function SidebarUpdate({ api }: { api: UpdateApi }) {
  const [state, setState] = useState<State>("idle");
  const [latest, setLatest] = useState<string | null>(null);

  async function check() {
    setState("checking");
    try {
      const info = await api.checkForUpdate();
      setLatest(info.latestVersion);
      setState(info.available ? "available" : "current");
    } catch {
      setState("error");
    }
  }

  async function install() {
    setState("installing");
    try {
      await api.installUpdate();
      setState("current");
    } catch {
      setState("error");
    }
  }

  const label =
    state === "checking"
      ? "Checking..."
      : state === "available"
        ? `Update ${latest ?? "available"}`
        : state === "installing"
          ? "Installing..."
          : state === "current"
            ? "Up to date"
            : state === "error"
              ? "Update check failed"
              : "Check for updates";

  return (
    <button
      aria-label={state === "available" ? "Install launcher update" : "Check for updates"}
      className={state === "available" ? `${styles.button} ${styles.available}` : styles.button}
      disabled={state === "checking" || state === "installing"}
      onClick={() => void (state === "available" ? install() : check())}
      type="button"
    >
      <RxUpdate aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
