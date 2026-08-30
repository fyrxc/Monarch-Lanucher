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
  extraLaunchParameters: string;
  skipBattlEye: boolean;
  uiSounds: boolean;
}

export interface InstalledMod {
  workshopId: string;
  name: string;
  path: string;
  previewUrl: string | null;
  creatorId: string | null;
  workshopUrl: string;
  creatorUrl: string | null;
  needsUpdate: boolean;
  isDownloading: boolean;
  isSubscribed: boolean;
}

export interface WorkshopModMetadata {
  workshopId: string;
  name: string;
  previewUrl: string | null;
  creatorId: string | null;
  workshopUrl: string;
  creatorUrl: string | null;
}

export type RequiredModState = "installed" | "missing" | "updating";

export interface RequiredMod {
  workshopId: string;
  name: string;
  previewUrl: string | null;
  state: RequiredModState;
}

export interface SystemStatus {
  steamFound: boolean;
  steamRunning: boolean;
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
