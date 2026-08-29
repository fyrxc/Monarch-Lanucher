export interface DayzServer {
  id: string;
  name: string;
  map: string;
  players: number;
  capacity: number;
  ping: number | null;
  ip: string;
  gamePort: number;
  queryPort: number;
  status: string;
  isPassworded: boolean;
  isOfficial: boolean;
  firstPersonOnly: boolean;
  country: string;
  requiredWorkshopIds: string[];
}

export interface ServerDirectoryResult {
  servers: DayzServer[];
  isPartial: boolean;
  warning: string | null;
}

export interface LauncherSettings {
  dayzName: string;
  dayzPath?: string;
  extraLaunchParameters: string;
  skipBattleye?: boolean;
  discordPresence?: boolean;
}

export interface InstalledMod {
  workshopId: string;
  name: string;
  path: string;
  previewUrl: string | null;
  description?: string | null;
  creator?: string | null;
  fileSize?: number | null;
  timeUpdated?: number | null;
  needsUpdate: boolean;
  isDownloading: boolean;
  isSubscribed: boolean;
}

export interface ServerModDetail {
  workshopId: string;
  name: string;
  isInstalled: boolean;
  isDownloading: boolean;
  needsUpdate: boolean;
}

export interface ServerLaunchPreflight {
  ready: boolean;
  missingWorkshopIds: string[];
  dayzRunning: boolean;
}

export interface WorkshopDownloadProgress {
  workshopId: string;
  downloadedBytes: number;
  totalBytes: number;
  isDownloading: boolean;
  isInstalled: boolean;
  isSubscribed: boolean;
  needsUpdate: boolean;
}

export interface SystemStatus {
  steamFound: boolean;
  steamRunning?: boolean;
  steamPath: string | null;
  steamPersonaName: string | null;
  dayzFound: boolean;
  dayzPath: string | null;
}

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string | null;
  notes: string | null;
}
