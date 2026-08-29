"use client";

import { useState } from "react";
import { FaKey, FaRegCopy } from "react-icons/fa6";
import type { DayzServer } from "../lib/models";
import { SlidePanel } from "./slide-panel";
import styles from "./server-info-panel.module.css";

export function ServerInfoPanel({
  server,
  open,
  onClose,
  onJoin,
}: {
  server: DayzServer | null;
  open: boolean;
  onClose: () => void;
  onJoin: (server: DayzServer) => void;
}) {
  const [copied, setCopied] = useState(false);

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
            <span>{server.requiredWorkshopIds.length}</span>
          </div>
          {server.requiredWorkshopIds.length === 0 ? (
            <div className={styles.vanilla}>Vanilla server</div>
          ) : (
            <div className={styles.modList}>
              {server.requiredWorkshopIds.map((workshopId) => (
                <div className={styles.modRow} key={workshopId}>
                  <span>Workshop {workshopId}</span>
                  <small>{workshopId}</small>
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
