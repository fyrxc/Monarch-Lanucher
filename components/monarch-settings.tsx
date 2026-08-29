"use client";

import { useState } from "react";
import { FaTrashCan } from "react-icons/fa6";
import { RxUpdate } from "react-icons/rx";
import { VscVerifiedFilled } from "react-icons/vsc";
import type { LauncherApi } from "../lib/api";
import type { InstalledMod, LauncherSettings, SystemStatus } from "../lib/models";
import { MonarchBrand } from "./monarch-brand";
import { MonarchConfirm } from "./monarch-confirm";
import styles from "./monarch-settings.module.css";

type SettingsApi = Pick<
  LauncherApi,
  "getInstalledMods" | "updateWorkshopMod" | "unsubscribeWorkshopMod"
>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function dayzDirectory(value: string | null | undefined): string {
  const path = value?.trim() ?? "";
  return path.replace(/[\\/]DayZ_x64\.exe$/i, "");
}

export function MonarchSettings({
  api,
  settings,
  systemStatus,
  onChange,
  onRefresh,
  onMessage,
  onError,
}: {
  api: SettingsApi;
  settings: LauncherSettings;
  systemStatus: SystemStatus | null;
  onChange: (patch: Partial<LauncherSettings>) => void;
  onRefresh: () => void;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState<"verify" | "uninstall" | null>(null);
  const [uninstallMods, setUninstallMods] = useState<InstalledMod[] | null>(null);
  const path = dayzDirectory(settings.dayzPath) || dayzDirectory(systemStatus?.dayzPath);

  async function verifyMods() {
    setBusy("verify");
    try {
      const mods = await api.getInstalledMods();
      for (const mod of mods) await api.updateWorkshopMod(mod.workshopId);
      onMessage(mods.length ? `Steam is checking ${mods.length} installed mod${mods.length === 1 ? "" : "s"}.` : "No DayZ Workshop mods were found.");
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function requestUninstallAll() {
    setBusy("uninstall");
    try {
      const mods = await api.getInstalledMods();
      if (mods.length === 0) {
        onMessage("No DayZ Workshop mods were found.");
        return;
      }
      setUninstallMods(mods);
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function uninstallAll() {
    if (!uninstallMods) return;
    setBusy("uninstall");
    try {
      for (const mod of uninstallMods) await api.unsubscribeWorkshopMod(mod.workshopId);
      const count = uninstallMods.length;
      setUninstallMods(null);
      onMessage(`Unsubscribed ${count} DayZ Workshop mod${count === 1 ? "" : "s"}.`);
      onRefresh();
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.content}>
      <MonarchBrand ariaLabel="Monarch settings brand" className={styles.brand} />

      <div className={styles.fields}>
        <label>
          <span>DayZ Path</span>
          <input aria-label="DayZ Path" onChange={(event) => onChange({ dayzPath: dayzDirectory(event.target.value) })} value={path} />
        </label>
        <label>
          <span>Ingame Name</span>
          <input aria-label="Ingame Name" onChange={(event) => onChange({ dayzName: event.target.value })} value={settings.dayzName} />
        </label>
      </div>

      <div className={styles.divider} />

      <div className={styles.toggles}>
        <label>
          <input aria-label="Skip BattlEye" checked={settings.skipBattleye ?? false} onChange={(event) => onChange({ skipBattleye: event.target.checked })} type="checkbox" />
          <span>Skip BattlEye</span>
        </label>
        <label>
          <input aria-label="Discord Presence" checked={settings.discordPresence ?? true} onChange={(event) => onChange({ discordPresence: event.target.checked })} type="checkbox" />
          <span>Discord Presence</span>
        </label>
      </div>

      <div className={styles.actions}>
        <button disabled={busy !== null} onClick={() => void verifyMods()} type="button"><VscVerifiedFilled aria-hidden="true" />{busy === "verify" ? "VERIFYING..." : "VERIFY MODS"}</button>
        <button disabled={busy !== null} onClick={() => void requestUninstallAll()} type="button"><FaTrashCan aria-hidden="true" />{busy === "uninstall" ? "WORKING..." : "UNINSTALL ALL MODS"}</button>
        <button onClick={onRefresh} type="button"><RxUpdate aria-hidden="true" />REFRESH</button>
      </div>

      {systemStatus ? (
        <div className={styles.system}>
          <span>{systemStatus.steamRunning ?? systemStatus.steamFound ? "Steam connected" : "Steam closed"}</span>
          <span>{systemStatus.dayzFound ? "DayZ detected" : "DayZ not detected"}</span>
        </div>
      ) : null}

      <MonarchConfirm
        busy={busy === "uninstall"}
        confirmLabel="UNINSTALL ALL"
        onCancel={() => setUninstallMods(null)}
        onConfirm={() => void uninstallAll()}
        open={Boolean(uninstallMods)}
        title="Uninstall all mods"
      >
        {uninstallMods ? `Unsubscribe all ${uninstallMods.length} detected DayZ Workshop mods through Steam?` : null}
      </MonarchConfirm>
    </div>
  );
}
