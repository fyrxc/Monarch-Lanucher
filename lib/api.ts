import { invoke } from "@tauri-apps/api/core";
import type {
  DayzServer,
  InstalledMod,
  LauncherSettings,
  RequiredMod,
  ServerDirectoryResult,
  SystemStatus,
  UpdateInfo,
  WorkshopModMetadata,
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
  openSteam(): Promise<void>;
  getInstalledMods(): Promise<InstalledMod[]>;
  getWorkshopModMetadata(workshopIds: string[]): Promise<WorkshopModMetadata[]>;
  getRequiredMods(server: DayzServer): Promise<RequiredMod[]>;
  syncRequiredMods(server: DayzServer): Promise<void>;
  updateWorkshopMod(workshopId: string): Promise<void>;
  unsubscribeWorkshopMod(workshopId: string): Promise<void>;
  openModFolder(workshopId: string): Promise<void>;
  checkForUpdate(): Promise<UpdateInfo>;
  installUpdate(): Promise<void>;
  launchServer(server: DayzServer, password?: string): Promise<void>;
  setDiscordPresence(view: string): Promise<void>;
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
  openSteam: () => invoke<void>("open_steam"),
  getInstalledMods: () => invoke<InstalledMod[]>("get_installed_mods"),
  getWorkshopModMetadata: (workshopIds) =>
    invoke<WorkshopModMetadata[]>("get_workshop_mod_metadata", { workshopIds }),
  getRequiredMods: (server) => invoke<RequiredMod[]>("get_required_mods", { server }),
  syncRequiredMods: (server) => invoke<void>("sync_required_mods", { server }),
  updateWorkshopMod: (workshopId) =>
    invoke<void>("update_workshop_mod", { workshopId }),
  unsubscribeWorkshopMod: (workshopId) =>
    invoke<void>("unsubscribe_workshop_mod", { workshopId }),
  openModFolder: (workshopId) => invoke<void>("open_mod_folder", { workshopId }),
  checkForUpdate: () => invoke<UpdateInfo>("check_for_update"),
  installUpdate: () => invoke<void>("install_update"),
  launchServer: (server, password) =>
    invoke<void>("launch_server", { server, password: password ?? null }),
  setDiscordPresence: (view) => invoke<void>("set_discord_presence", { view }),
};
