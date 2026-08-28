import { invoke } from "@tauri-apps/api/core";
import type {
  DayzServer,
  InstalledMod,
  LauncherSettings,
  ServerDirectoryResult,
  SystemStatus,
  UpdateInfo,
} from "./models";

export interface LauncherApi {
  getServers(): Promise<ServerDirectoryResult>;
  getFavorites(): Promise<DayzServer[]>;
  toggleFavorite(server: DayzServer): Promise<boolean>;
  getRecent(): Promise<DayzServer[]>;
  clearRecent(): Promise<void>;
  getSettings(): Promise<LauncherSettings>;
  saveSettings(settings: LauncherSettings): Promise<void>;
  getSystemStatus(): Promise<SystemStatus>;
  getInstalledMods(): Promise<InstalledMod[]>;
  checkForUpdate(): Promise<UpdateInfo>;
  installUpdate(): Promise<void>;
  launchServer(server: DayzServer): Promise<void>;
}

export const tauriApi: LauncherApi = {
  getServers: () => invoke<ServerDirectoryResult>("get_servers"),
  getFavorites: () => invoke<DayzServer[]>("get_favorites"),
  toggleFavorite: (server) => invoke<boolean>("toggle_favorite", { server }),
  getRecent: () => invoke<DayzServer[]>("get_recent"),
  clearRecent: () => invoke<void>("clear_recent"),
  getSettings: () => invoke<LauncherSettings>("get_settings"),
  saveSettings: (settings) => invoke<void>("save_settings", { settings }),
  getSystemStatus: () => invoke<SystemStatus>("get_system_status"),
  getInstalledMods: () => invoke<InstalledMod[]>("get_installed_mods"),
  checkForUpdate: () => invoke<UpdateInfo>("check_for_update"),
  installUpdate: () => invoke<void>("install_update"),
  launchServer: (server) => invoke<void>("launch_server", { server }),
};
