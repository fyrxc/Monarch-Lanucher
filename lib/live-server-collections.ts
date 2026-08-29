import type { DayzServer } from "./models";
import { serverIdentity } from "./server-id";

export function reconcileServerCollection(
  saved: DayzServer[],
  live: DayzServer[],
): DayzServer[] {
  if (saved.length === 0 || live.length === 0) return saved;

  const liveByIdentity = new Map(
    live.map((server) => [serverIdentity(server), server] as const),
  );

  return saved.map((server) => liveByIdentity.get(serverIdentity(server)) ?? server);
}

export function sortServersWithFavoritesFirst(
  servers: DayzServer[],
  favoriteIds: ReadonlySet<string>,
): DayzServer[] {
  if (servers.length < 2 || favoriteIds.size === 0) return servers;

  const favorites: DayzServer[] = [];
  const others: DayzServer[] = [];

  for (const server of servers) {
    if (favoriteIds.has(serverIdentity(server))) favorites.push(server);
    else others.push(server);
  }

  return [...favorites, ...others];
}
