import { invoke } from "@tauri-apps/api/core";
import type {
  DayzServer,
  InstalledMod,
  LauncherSettings,
  ServerDirectoryResult,
  ServerLaunchPreflight,
  ServerModDetail,
  SystemStatus,
  UpdateInfo,
  WorkshopDownloadProgress,
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
  prepareServerLaunch(server: DayzServer): Promise<ServerLaunchPreflight>;
  setupServerMods(workshopIds: string[]): Promise<void>;
  getWorkshopDownloadProgress(workshopIds: string[]): Promise<WorkshopDownloadProgress[]>;
  getServerModDetails?(workshopIds: string[]): Promise<ServerModDetail[]>;
  pingServer?(server: DayzServer): Promise<number | null>;
  getDayzRunning?(): Promise<boolean>;
  setDiscordPresence?(state: string, details?: string | null): Promise<boolean>;
  clearDiscordPresence?(): Promise<boolean>;
  closeDayz(): Promise<void>;
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
  prepareServerLaunch: (server) =>
    invoke<ServerLaunchPreflight>("prepare_server_launch", { server }),
  setupServerMods: (workshopIds) => invoke<void>("setup_server_mods", { workshopIds }),
  getWorkshopDownloadProgress: (workshopIds) =>
    invoke<WorkshopDownloadProgress[]>("get_workshop_download_progress", { workshopIds }),
  getServerModDetails: (workshopIds) =>
    invoke<ServerModDetail[]>("get_server_mod_details", { workshopIds }),
  pingServer: (server) => invoke<number | null>("ping_server", { server }),
  getDayzRunning: () => invoke<boolean>("get_dayz_running"),
  setDiscordPresence: (state, details = null) =>
    invoke<boolean>("set_discord_presence", { state, details }),
  clearDiscordPresence: () => invoke<boolean>("clear_discord_presence"),
  closeDayz: () => invoke<void>("close_dayz"),
  launchServer: (server, password = null) =>
    invoke<void>("launch_server", { server, password }),
};
