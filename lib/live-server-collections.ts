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
