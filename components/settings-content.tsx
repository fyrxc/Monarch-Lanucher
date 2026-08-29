"use client";

import { useState } from "react";
import type { LauncherApi } from "../lib/api";
import type { InstalledMod, LauncherSettings, SystemStatus } from "../lib/models";
import { ConfirmDialog } from "./confirm-dialog";
import { MonarchBrand } from "./monarch-brand";
import styles from "./settings-content.module.css";

type SettingsApi = Pick<
  LauncherApi,
  "getInstalledMods" | "updateWorkshopMod" | "unsubscribeWorkshopMod"
>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function detectedDayzDirectory(path: string | null | undefined): string {
  const value = path?.trim() ?? "";
  if (!value) return "";
  return value.replace(/[\\/]DayZ_x64\.exe$/i, "");
}

export function SettingsContent({
  api,
  settings,
  systemStatus,
  saving,
  onChange,
  onSave,
  onRefresh,
  onMessage,
  onError,
}: {
  api: SettingsApi;
  settings: LauncherSettings;
  systemStatus: SystemStatus | null;
  saving: boolean;
  onChange: (settings: LauncherSettings) => void;
  onSave: () => void;
  onRefresh: () => void;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [busyAction, setBusyAction] = useState<"verify" | "uninstall" | null>(null);
  const [uninstallMods, setUninstallMods] = useState<InstalledMod[] | null>(null);
  const configuredDayzDirectory = detectedDayzDirectory(settings.dayzPath);
  const detectedDirectory = detectedDayzDirectory(systemStatus?.dayzPath);
  const dayzPathValue = configuredDayzDirectory || detectedDirectory;

  async function verifyMods() {
    setBusyAction("verify");
    try {
      const mods = await api.getInstalledMods();
      for (const mod of mods) {
        await api.updateWorkshopMod(mod.workshopId);
      }
      onMessage(
        mods.length === 0
          ? "No installed DayZ Workshop mods were found."
          : `Steam is checking ${mods.length} installed ${mods.length === 1 ? "mod" : "mods"}.`,
      );
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function requestUninstallAll() {
    setBusyAction("uninstall");
    try {
      const mods = await api.getInstalledMods();
      if (mods.length === 0) {
        onMessage("No installed DayZ Workshop mods were found.");
        return;
      }
      setUninstallMods(mods);
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function confirmUninstallAll() {
    if (!uninstallMods) return;
    setBusyAction("uninstall");
    try {
      for (const mod of uninstallMods) {
        await api.unsubscribeWorkshopMod(mod.workshopId);
      }
      const count = uninstallMods.length;
      setUninstallMods(null);
      onMessage(`Unsubscribed ${count} DayZ Workshop ${count === 1 ? "mod" : "mods"}.`);
      onRefresh();
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className={styles.content}>
      <MonarchBrand className={styles.brand} />

      <div className={styles.section}>
        <label className={styles.fieldLabel}>
          <span>DayZ Path</span>
          <input
            aria-label="DayZ Path"
            className={styles.input}
            onChange={(event) => onChange({ ...settings, dayzPath: detectedDayzDirectory(event.target.value) })}
            placeholder="Auto-detected DayZ path"
            value={dayzPathValue}
          />
        </label>

        <label className={styles.fieldLabel}>
          <span>Ingame Name</span>
          <input
            aria-label="Ingame Name"
            className={styles.input}
            onChange={(event) => onChange({ ...settings, dayzName: event.target.value })}
            placeholder="Steam public name"
            value={settings.dayzName}
          />
        </label>
      </div>

      <div className={styles.toggles}>
        <label className={styles.toggleRow}>
          <div>
            <strong>Skip BattlEye</strong>
            <span>Launch without BattlEye protection.</span>
          </div>
          <input
            aria-label="Skip BattlEye"
            checked={settings.skipBattleye ?? false}
            onChange={(event) => onChange({ ...settings, skipBattleye: event.target.checked })}
            type="checkbox"
          />
        </label>
        <label className={styles.toggleRow}>
          <div>
            <strong>Discord Presence</strong>
            <span>Show Monarch Launcher and your current server in Discord.</span>
          </div>
          <input
            aria-label="Discord Presence"
            checked={settings.discordPresence ?? true}
            onChange={(event) => onChange({ ...settings, discordPresence: event.target.checked })}
            type="checkbox"
          />
        </label>
      </div>

      <label className={styles.fieldLabel}>
        <span>Extra Launch Parameters</span>
        <input
          aria-label="Extra Launch Parameters"
          className={styles.input}
          onChange={(event) =>
            onChange({ ...settings, extraLaunchParameters: event.target.value })
          }
          placeholder="-nosplash"
          value={settings.extraLaunchParameters}
        />
      </label>

      <div className={styles.actions}>
        <button
          className={styles.secondary}
          disabled={busyAction !== null}
          onClick={() => void verifyMods()}
          type="button"
        >
          {busyAction === "verify" ? "VERIFYING..." : "VERIFY MODS"}
        </button>
        <button
          className={styles.danger}
          disabled={busyAction !== null}
          onClick={() => void requestUninstallAll()}
          type="button"
        >
          {busyAction === "uninstall" ? "WORKING..." : "UNINSTALL ALL MODS"}
        </button>
        <button className={styles.secondary} onClick={onRefresh} type="button">
          REFRESH
        </button>
      </div>

      <button
        className={styles.save}
        disabled={saving}
        onClick={onSave}
        type="button"
      >
        {saving ? "SAVING..." : "SAVE SETTINGS"}
      </button>

      {systemStatus ? (
        <div className={styles.systemLine}>
          <span className={systemStatus.steamFound ? styles.ok : styles.bad}>
            {systemStatus.steamFound ? "Steam detected" : "Steam not detected"}
          </span>
          <span className={systemStatus.dayzFound ? styles.ok : styles.bad}>
            {systemStatus.dayzFound ? "DayZ detected" : "DayZ not detected"}
          </span>
        </div>
      ) : null}

      {uninstallMods ? (
        <ConfirmDialog
          busy={busyAction === "uninstall"}
          confirmLabel="UNINSTALL ALL"
          onCancel={() => setUninstallMods(null)}
          onConfirm={() => void confirmUninstallAll()}
          title="Uninstall all mods"
        >
          Unsubscribe all {uninstallMods.length} detected DayZ Workshop mods through Steam?
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
