"use client";

import { useEffect, useState } from "react";
import { FaKey, FaRegCopy } from "react-icons/fa6";
import type { LauncherApi } from "../lib/api";
import type { DayzServer, ServerModDetail } from "../lib/models";
import { SlidePanel } from "./slide-panel";
import styles from "./server-info-panel.module.css";

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

function statusLabel(mod: ServerModDetail): string {
  if (mod.isDownloading || mod.needsUpdate) return "Updating";
  if (mod.isInstalled) return "Installed";
  return "Missing";
}

export function ServerInfoPanel({
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
  const [copied, setCopied] = useState(false);
  const [modDetails, setModDetails] = useState<ServerModDetail[]>([]);
  const [loadingMods, setLoadingMods] = useState(false);

  useEffect(() => {
    if (!open || !server) return;
    const fallback = fallbackDetails(server);
    setModDetails(fallback);
    const load = api?.getServerModDetails;
    if (!load || server.requiredWorkshopIds.length === 0) return;

    let cancelled = false;
    setLoadingMods(true);
    void load(server.requiredWorkshopIds)
      .then((details) => {
        if (!cancelled) setModDetails(details.length > 0 ? details : fallback);
      })
      .catch(() => {
        if (!cancelled) setModDetails(fallback);
      })
      .finally(() => {
        if (!cancelled) setLoadingMods(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, open, server]);

  if (!server) return null;

  const address = `${server.ip}:${server.gamePort}`;
  const online = server.status.toLocaleLowerCase() === "online";

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <SlidePanel open={open} title="Server Info" onClose={onClose}>
      <div className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.badges}>
            <span className={online ? styles.online : styles.offline}>{online ? "ONLINE" : server.status || "UNKNOWN"}</span>
            <span>{server.isOfficial ? "OFFICIAL" : "COMMUNITY"}</span>
            {server.isPassworded ? <span className={styles.locked}><FaKey aria-hidden="true" /> LOCKED</span> : null}
          </div>
          <h3>{server.name}</h3>
          <div className={styles.addressRow}>
            <div>
              <strong>{address}</strong>
              <small>Query port {server.queryPort}</small>
            </div>
            <button
              aria-label="Copy server address"
              className={styles.iconButton}
              onClick={() => void copyAddress()}
              type="button"
            >
              <FaRegCopy aria-hidden="true" />
            </button>
            {copied ? <span className={styles.copied}>Copied</span> : null}
          </div>
        </section>

        <dl className={styles.stats}>
          <div><dt>Map</dt><dd>{server.map || "--"}</dd></div>
          <div><dt>Players</dt><dd>{server.players} / {server.capacity}</dd></div>
          <div><dt>Ping</dt><dd>{server.ping === null ? "--" : `${server.ping} ms`}</dd></div>
          <div><dt>Perspective</dt><dd>{server.firstPersonOnly ? "1PP" : "1PP / 3PP"}</dd></div>
          <div><dt>Region</dt><dd>{server.country || "--"}</dd></div>
          <div><dt>Type</dt><dd>{server.isOfficial ? "Official" : "Community"}</dd></div>
        </dl>

        <section className={styles.modsSection}>
          <div className={styles.sectionHeading}>
            <div>
              <h4>Required Mods</h4>
              <p>Steam Workshop requirements for this server.</p>
            </div>
            <span>{loadingMods ? "Checking..." : `${server.requiredWorkshopIds.length} MOD${server.requiredWorkshopIds.length === 1 ? "" : "S"}`}</span>
          </div>
          {server.requiredWorkshopIds.length === 0 ? (
            <div className={styles.vanilla}>No Workshop mods required.</div>
          ) : (
            <div className={styles.modList}>
              {modDetails.map((mod) => (
                <div className={styles.modRow} key={mod.workshopId}>
                  <div className={styles.modIdentity}>
                    <span>{mod.name}</span>
                    <small>Workshop {mod.workshopId}</small>
                  </div>
                  <strong className={`${styles.modStatus} ${styles[statusLabel(mod).toLowerCase()]}`}>
                    {statusLabel(mod)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className={styles.joinArea}>
          <div>
            <strong>{server.players} / {server.capacity}</strong>
            <span>{server.ping === null ? "Ping checking..." : `${server.ping} ms`}</span>
          </div>
          <button className={styles.joinButton} onClick={() => onJoin(server)} type="button">
            JOIN SERVER
          </button>
        </div>
      </div>
    </SlidePanel>
  );
}
