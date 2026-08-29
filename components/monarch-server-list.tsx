"use client";

import { memo, useState } from "react";
import { FaRegStar, FaStar } from "react-icons/fa";
import { FaChevronRight, FaKey } from "react-icons/fa6";
import type { LauncherApi } from "../lib/api";
import type { DayzServer } from "../lib/models";
import { pingStatus } from "../lib/ping-status";
import { serverIdentity } from "../lib/server-id";
import { MonarchServerInfo } from "./monarch-server-info";
import styles from "./monarch-server-list.module.css";

export const MonarchServerList = memo(function MonarchServerList({
  servers,
  favoriteIds,
  joiningId,
  api,
  onFavorite,
  onJoin,
}: {
  servers: DayzServer[];
  favoriteIds: ReadonlySet<string>;
  joiningId: string | null;
  api?: Pick<LauncherApi, "getServerModDetails">;
  onFavorite: (server: DayzServer) => void;
  onJoin: (server: DayzServer) => void;
}) {
  const [selected, setSelected] = useState<DayzServer | null>(null);

  if (servers.length === 0) {
    return <div className={styles.empty}>No servers match your filters.</div>;
  }

  return (
    <>
      <div className={styles.wrap}>
        <table aria-label="DayZ servers" className={styles.table}>
          <thead>
            <tr>
              <th aria-label="Favorite" />
              <th>Name</th>
              <th>Map</th>
              <th>Players</th>
              <th>Ping</th>
              <th>Mods</th>
              <th>View</th>
              <th aria-label="Join" />
            </tr>
          </thead>
          <tbody>
            {servers.map((server) => {
              const id = serverIdentity(server);
              const favorite = favoriteIds.has(id);
              const tone = pingStatus(server.ping);
              const joining = joiningId === id;
              return (
                <tr key={id}>
                  <td className={styles.favoriteCell}>
                    <button
                      aria-label={favorite ? `Remove ${server.name} from favorites` : `Favorite ${server.name}`}
                      className={favorite ? `${styles.star} ${styles.starActive}` : styles.star}
                      onClick={() => onFavorite(server)}
                      type="button"
                    >
                      {favorite ? <FaStar aria-hidden="true" /> : <FaRegStar aria-hidden="true" />}
                    </button>
                  </td>
                  <td className={styles.nameCell}>
                    <button className={styles.nameButton} onClick={() => setSelected(server)} type="button">
                      <span className={styles.nameLine}>
                        <strong>{server.name}</strong>
                        {server.isPassworded ? <FaKey aria-label="Password protected" /> : null}
                      </span>
                      <small>{server.ip}:{server.gamePort}</small>
                    </button>
                  </td>
                  <td>{server.map || "--"}</td>
                  <td className={styles.number}>{server.players}/{server.capacity}</td>
                  <td className={`${styles.number} ${styles[tone]}`}>{server.ping === null ? "--" : `${server.ping} ms`}</td>
                  <td className={styles.number}>{server.requiredWorkshopIds.length || "0"}</td>
                  <td>{server.firstPersonOnly ? "1PP" : "3PP"}</td>
                  <td className={styles.actions}>
                    <button className={styles.join} disabled={joining} onClick={() => onJoin(server)} type="button">
                      {joining ? "JOINING" : "JOIN"}
                    </button>
                    <button aria-label={`Open server info for ${server.name}`} className={styles.info} onClick={() => setSelected(server)} type="button">
                      <FaChevronRight aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <MonarchServerInfo
        api={api}
        onClose={() => setSelected(null)}
        onJoin={(server) => {
          setSelected(null);
          onJoin(server);
        }}
        open={selected !== null}
        server={selected}
      />
    </>
  );
});
