"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LauncherApi } from "./api";
import type { DayzServer } from "./models";

const SESSION_POLL_MS = 1500;

export function useLauncherSession(
  api: LauncherApi,
  discordEnabled: boolean,
  onFinished: () => void,
) {
  const [server, setServer] = useState<DayzServer | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [seenRunning, setSeenRunning] = useState(false);
  const lastPresence = useRef<string | null>(null);

  const updatePresence = useCallback(
    async (state: string, details: string) => {
      if (!discordEnabled || !api.setDiscordPresence) return;
      const key = `${state}\n${details}`;
      if (lastPresence.current === key) return;
      lastPresence.current = key;
      try {
        await api.setDiscordPresence(state, details);
      } catch {
        // Discord can be closed without affecting launcher behavior.
      }
    },
    [api, discordEnabled],
  );

  const startSession = useCallback(
    (nextServer: DayzServer) => {
      setServer(nextServer);
      setSeenRunning(false);
      setStatus(`Launching ${nextServer.name}`);
      void updatePresence("Launching DayZ", nextServer.name);
    },
    [updatePresence],
  );

  useEffect(() => {
    if (discordEnabled) {
      if (!server) void updatePresence("Browsing servers", "Monarch Launcher");
      return;
    }
    lastPresence.current = null;
    if (api.clearDiscordPresence) {
      void api.clearDiscordPresence().catch(() => undefined);
    }
  }, [api, discordEnabled, server, updatePresence]);

  useEffect(() => {
    const getDayzRunning = api.getDayzRunning;
    if (!server || !getDayzRunning) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const running = await getDayzRunning();
        if (cancelled) return;
        if (running) {
          if (!seenRunning) setSeenRunning(true);
          setStatus(`Playing ${server.name}`);
          void updatePresence("Playing DayZ", server.name);
          return;
        }
        if (!seenRunning) return;

        setStatus(`Last played ${server.name}`);
        setServer(null);
        setSeenRunning(false);
        onFinished();
      } catch {
        // Runtime process checks are advisory and must never break the launcher UI.
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), SESSION_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [api, onFinished, seenRunning, server, updatePresence]);

  return { startSession, status };
}
