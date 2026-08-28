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
}

export interface InstalledMod {
  workshopId: string;
  name: string;
  path: string;
}

export interface SystemStatus {
  steamFound: boolean;
  steamPath: string | null;
  dayzFound: boolean;
  dayzPath: string | null;
}
