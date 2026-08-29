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
  updateWorkshopMod(workshopId: string): Promise<void>;
  unsubscribeWorkshopMod(workshopId: string): Promise<void>;
  openModFolder(workshopId: string): Promise<void>;
  checkForUpdate(): Promise<UpdateInfo>;
  installUpdate(): Promise<void>;
  launchServer(server: DayzServer, password?: string | null): Promise<void>;
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
  updateWorkshopMod: (workshopId) =>
    invoke<void>("update_workshop_mod", { workshopId }),
  unsubscribeWorkshopMod: (workshopId) =>
    invoke<void>("unsubscribe_workshop_mod", { workshopId }),
  openModFolder: (workshopId) => invoke<void>("open_mod_folder", { workshopId }),
  checkForUpdate: () => invoke<UpdateInfo>("check_for_update"),
  installUpdate: () => invoke<void>("install_update"),
  launchServer: (server, password = null) =>
    invoke<void>("launch_server", { server, password }),
};
