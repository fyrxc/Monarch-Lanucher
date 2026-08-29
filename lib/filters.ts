import type { DayzServer } from "./models";

export interface ServerFilters {
  search: string;
  map: string;
  minPlayers: number | null;
  maxPlayers: number | null;
  maxPing: number | null;
  hideEmpty: boolean;
  hideFull: boolean;
  modded: boolean | null;
  passworded: boolean | null;
  official: boolean | null;
  firstPersonOnly: boolean | null;
  favoritesOnly: boolean;
}

function matchesTriState(value: boolean, filter: boolean | null): boolean {
  return filter === null || value === filter;
}

function hasActiveFilters(filters: ServerFilters): boolean {
  return Boolean(
    filters.search.trim() ||
      filters.map.trim() ||
      filters.minPlayers !== null ||
      filters.maxPlayers !== null ||
      filters.maxPing !== null ||
      filters.hideEmpty ||
      filters.hideFull ||
      filters.modded !== null ||
      filters.passworded !== null ||
      filters.official !== null ||
      filters.firstPersonOnly !== null ||
      filters.favoritesOnly,
  );
}

export function filterServers(
  servers: DayzServer[],
  filters: ServerFilters,
  favoriteIds: ReadonlySet<string> = new Set<string>(),
): DayzServer[] {
  if (!hasActiveFilters(filters)) {
    return servers;
  }

  const search = filters.search.trim().toLowerCase();
  const map = filters.map.trim().toLowerCase();

  return servers.filter((server) => {
    if (search) {
      const address = `${server.ip}:${server.gamePort}`;
      const searchable = `${server.name}\n${server.map}\n${address}`.toLowerCase();
      if (!searchable.includes(search)) return false;
    }

    if (map && server.map.toLowerCase() !== map) return false;
    if (filters.minPlayers !== null && server.players < filters.minPlayers) return false;
    if (filters.maxPlayers !== null && server.players > filters.maxPlayers) return false;
    if (filters.maxPing !== null && server.ping !== null && server.ping > filters.maxPing) return false;
    if (filters.hideEmpty && server.players === 0) return false;
    if (filters.hideFull && server.capacity > 0 && server.players >= server.capacity) return false;
    if (
      filters.modded !== null &&
      !matchesTriState(server.requiredWorkshopIds.length > 0, filters.modded)
    ) {
      return false;
    }
    if (!matchesTriState(server.isPassworded, filters.passworded)) return false;
    if (!matchesTriState(server.isOfficial, filters.official)) return false;
    if (!matchesTriState(server.firstPersonOnly, filters.firstPersonOnly)) return false;
    if (filters.favoritesOnly && !favoriteIds.has(server.id)) return false;

    return true;
  });
}
