import type { DayzServer } from "./models";

const SERVER_CACHE_KEY = "monarch.server-directory.v1";
const MAX_SERVER_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

interface ServerCachePayload {
  savedAt: number;
  servers: DayzServer[];
}

export function readServerCache(now = Date.now()): DayzServer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SERVER_CACHE_KEY);
    if (!raw) return [];
    const payload = JSON.parse(raw) as Partial<ServerCachePayload>;
    if (!Array.isArray(payload.servers) || typeof payload.savedAt !== "number") return [];
    if (now - payload.savedAt > MAX_SERVER_CACHE_AGE_MS) return [];
    return payload.servers as DayzServer[];
  } catch {
    return [];
  }
}

export function writeServerCache(servers: DayzServer[], now = Date.now()): void {
  if (typeof window === "undefined" || servers.length === 0) return;
  try {
    const payload: ServerCachePayload = { savedAt: now, servers };
    window.localStorage.setItem(SERVER_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // A cache failure must never block the live server directory.
  }
}
