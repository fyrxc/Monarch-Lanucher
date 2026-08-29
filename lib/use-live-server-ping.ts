"use client";

import { useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { LauncherApi } from "./api";
import type { DayzServer } from "./models";
import { serverIdentity } from "./server-id";

const MAX_CONCURRENT_PINGS = 12;

export function useLiveServerPing(
  api: LauncherApi,
  enabled: boolean,
  targets: DayzServer[],
  setServers: Dispatch<SetStateAction<DayzServer[]>>,
): void {
  const targetKey = useMemo(
    () => targets.map((server) => serverIdentity(server)).join("|"),
    [targets],
  );

  useEffect(() => {
    const pingServer = api.pingServer;
    if (!enabled || !pingServer || targets.length === 0) return;

    let cancelled = false;
    let nextIndex = 0;
    const snapshot = [...targets];

    const worker = async () => {
      while (!cancelled) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= snapshot.length) return;
        const target = snapshot[index];
        try {
          const ping = await pingServer(target);
          if (cancelled) return;
          const identity = serverIdentity(target);
          setServers((current) =>
            current.map((server) =>
              serverIdentity(server) === identity && server.ping !== ping
                ? { ...server, ping }
                : server,
            ),
          );
        } catch {
          // A single unreachable server should never block the directory.
        }
      }
    };

    const workers = Math.min(MAX_CONCURRENT_PINGS, snapshot.length);
    void Promise.all(Array.from({ length: workers }, () => worker()));
    return () => {
      cancelled = true;
    };
    // targetKey intentionally ignores ping value changes so results do not retrigger themselves.
  }, [api, enabled, setServers, targetKey]);
}
