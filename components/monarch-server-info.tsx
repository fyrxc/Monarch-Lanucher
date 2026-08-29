"use client";

import { useEffect, useState } from "react";
import { FaRegCopy } from "react-icons/fa6";
import type { LauncherApi } from "../lib/api";
import type { DayzServer, ServerModDetail } from "../lib/models";
import { pingStatus } from "../lib/ping-status";
import { MonarchDrawer } from "./monarch-drawer";
import styles from "./monarch-server-info.module.css";

type ServerInfoApi = Pick<LauncherApi, "getServerModDetails">;

function fallbackDetails(server: DayzServer): ServerModDetail[] {
  return server.requiredWorkshopIds.map((workshopId) => ({
    workshopId,
    name: `Workshop ${workshopId}`,
    isInstalled: false,
    isDownloading: false,
    needsUpdate: false,
  }));
}

function modState(mod: ServerModDetail): string {
  if (mod.isDownloading) return "Downloading";
  if (mod.needsUpdate) return "Needs Update";
  if (mod.isInstalled) return "Installed";
  return "Missing";
}

export function MonarchServerInfo({
  server,
  open,
  api,
  onClose,
  onJoin,
}: {
  server: DayzServer | null;
  open: boolean;
  api?: ServerInfoApi;
  onClose: () => void;
  onJoin: (server: DayzServer) => void;
}) {
  const [mods, setMods] = useState<ServerModDetail[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !server) return;
    const fallback = fallbackDetails(server);
    setMods(fallback);
    const load = api?.getServerModDetails;
    if (!load || server.requiredWorkshopIds.length === 0) return;
    let cancelled = false;
    void load(server.requiredWorkshopIds)
      .then((items) => { if (!cancelled) setMods(items.length ? items : fallback); })
      .catch(() => { if (!cancelled) setMods(fallback); });
    return () => { cancelled = true; };
  }, [api, open, server]);

  if (!server) return null;
  const address = `${server.ip}:${server.gamePort}`;
  const ping = pingStatus(server.ping);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <MonarchDrawer label="Server Info" onClose={onClose} open={open}>
      <div className={styles.content}>
        <div className={styles.titleRow}>
          <div>
            <div className={styles.kicker}>SERVER INFO</div>
            <h2>{server.name}</h2>
          </div>
          <span className={styles.state}>{server.status || "Unknown"}</span>
        </div>

        <div className={styles.address}>
          <div>
            <span>IP + Port</span>
            <strong>{address}</strong>
          </div>
          <button aria-label="Copy server address" onClick={() => void copyAddress()} type="button"><FaRegCopy aria-hidden="true" /></button>
          {copied ? <small>Copied</small> : null}
        </div>

        <div className={styles.grid}>
          <div><span>Map</span><strong>{server.map || "--"}</strong></div>
          <div><span>Players</span><strong>{server.players}/{server.capacity}</strong></div>
          <div><span>Ping</span><strong className={styles[ping]}>{server.ping === null ? "--" : `${server.ping} ms`}</strong></div>
          <div><span>Perspective</span><strong>{server.firstPersonOnly ? "1PP" : "1PP / 3PP"}</strong></div>
          <div><span>Region</span><strong>{server.country || "--"}</strong></div>
          <div><span>Type</span><strong>{server.isOfficial ? "Official" : "Community"}</strong></div>
          <div><span>Password</span><strong>{server.isPassworded ? "Required" : "None"}</strong></div>
          <div><span>Query Port</span><strong>{server.queryPort}</strong></div>
        </div>

        <section className={styles.mods}>
          <div className={styles.sectionTitle}>
            <span>Required Mods</span>
            <small>{server.requiredWorkshopIds.length}</small>
          </div>
          {server.requiredWorkshopIds.length === 0 ? (
            <div className={styles.empty}>No Workshop mods required.</div>
          ) : (
            <div className={styles.modList}>
              {mods.map((mod) => (
                <div className={styles.mod} key={mod.workshopId}>
                  <div><strong>{mod.name}</strong><small>{mod.workshopId}</small></div>
                  <span>{modState(mod)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <button className={styles.join} onClick={() => onJoin(server)} type="button">JOIN</button>
      </div>
    </MonarchDrawer>
  );
}
