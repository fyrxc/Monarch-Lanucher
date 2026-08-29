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

  if (!server) {
    return null;
  }

  const address = `${server.ip}:${server.gamePort}`;

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
        <div className={styles.identity}>
          <div className={styles.nameRow}>
            <h3>{server.name}</h3>
            {server.isPassworded ? <FaKey aria-label="Password protected" /> : null}
          </div>
          <div className={styles.addressRow}>
            <span>{address}</span>
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
        </div>

        <dl className={styles.stats}>
          <div>
            <dt>Map</dt>
            <dd>{server.map || "--"}</dd>
          </div>
          <div>
            <dt>Players</dt>
            <dd>{server.players} / {server.capacity}</dd>
          </div>
          <div>
            <dt>Ping</dt>
            <dd>{server.ping === null ? "--" : `${server.ping} ms`}</dd>
          </div>
          <div>
            <dt>View</dt>
            <dd>{server.firstPersonOnly ? "1PP" : "3PP"}</dd>
          </div>
        </dl>

        <section className={styles.modsSection}>
          <div className={styles.sectionHeading}>
            <h4>Required Mods</h4>
            <span>{loadingMods ? "Checking..." : server.requiredWorkshopIds.length}</span>
          </div>
          {server.requiredWorkshopIds.length === 0 ? (
            <div className={styles.vanilla}>Vanilla server</div>
          ) : (
            <div className={styles.modList}>
              {modDetails.map((mod) => (
                <div className={styles.modRow} key={mod.workshopId}>
                  <div className={styles.modIdentity}>
                    <span>{mod.name}</span>
                    <small>{mod.workshopId}</small>
                  </div>
                  <strong className={`${styles.modStatus} ${styles[statusLabel(mod).toLowerCase()]}`}>
                    {statusLabel(mod)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <button
          className={styles.joinButton}
          onClick={() => onJoin(server)}
          type="button"
        >
          JOIN SERVER
        </button>
      </div>
    </SlidePanel>
  );
}
