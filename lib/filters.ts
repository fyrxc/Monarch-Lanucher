import type { DayzServer } from "./models";
import { serverIdentity } from "./server-id";

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

export function filterServers(
  servers: DayzServer[],
  filters: ServerFilters,
  favoriteIds: ReadonlySet<string> = new Set<string>()
): DayzServer[] {
  const search = filters.search.trim().toLocaleLowerCase();
  const map = filters.map.trim().toLocaleLowerCase();

  const filtered = servers.filter((server) => {
    const address = `${server.ip}:${server.gamePort}`;
    const isModded = server.requiredWorkshopIds.length > 0;
    const favorite = favoriteIds.has(serverIdentity(server));

    if (search) {
      const searchable = `${server.name}\n${server.map}\n${address}`.toLocaleLowerCase();
      if (!searchable.includes(search)) return false;
    }

    if (map && server.map.toLocaleLowerCase() !== map) return false;
    if (filters.minPlayers !== null && server.players < filters.minPlayers) return false;
    if (filters.maxPlayers !== null && server.players > filters.maxPlayers) return false;
    if (filters.maxPing !== null && server.ping !== null && server.ping > filters.maxPing) return false;
    if (filters.hideEmpty && server.players === 0) return false;
    if (filters.hideFull && server.capacity > 0 && server.players >= server.capacity) return false;
    if (!matchesTriState(isModded, filters.modded)) return false;
    if (!matchesTriState(server.isPassworded, filters.passworded)) return false;
    if (!matchesTriState(server.isOfficial, filters.official)) return false;
    if (!matchesTriState(server.firstPersonOnly, filters.firstPersonOnly)) return false;
    if (filters.favoritesOnly && !favorite) return false;

    return true;
  });

  return filtered
    .map((server, index) => ({ server, index, favorite: favoriteIds.has(serverIdentity(server)) }))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.index - b.index)
    .map(({ server }) => server);
}
