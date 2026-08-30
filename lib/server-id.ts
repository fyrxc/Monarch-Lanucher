import type { DayzServer } from "./models";

export function serverIdentity(server: DayzServer): string {
  const id = server.id.trim();
  return id || `${server.ip.trim().toLocaleLowerCase()}:${server.gamePort}`;
}
