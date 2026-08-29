export type PingStatus = "good" | "medium" | "bad" | "unavailable";

export function pingStatus(ping: number | null): PingStatus {
  if (ping === null || !Number.isFinite(ping) || ping < 0) return "unavailable";
  if (ping <= 70) return "good";
  if (ping <= 110) return "medium";
  return "bad";
}
