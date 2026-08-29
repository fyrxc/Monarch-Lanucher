import { memo, useState } from "react";
import { FaRegStar, FaStar } from "react-icons/fa";
import { FaChevronRight, FaKey } from "react-icons/fa6";
import type { LauncherApi } from "../lib/api";
import type { DayzServer } from "../lib/models";
import { serverIdentity } from "../lib/server-id";
import { ServerInfoPanel } from "./server-info-panel";
import styles from "./server-table.module.css";

function pingTone(ping: number | null): string {
  if (ping === null) return styles.pingUnknown;
  if (ping <= 70) return styles.pingGood;
  if (ping <= 110) return styles.pingMedium;
  return styles.pingBad;
}

export const ServerTable = memo(function ServerTable({
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
  const [selectedServer, setSelectedServer] = useState<DayzServer | null>(null);

  if (servers.length === 0) {
    return <div className="empty-state">No servers match your filters.</div>;
  }

  return (
    <>
      <div className="server-table-wrap">
        <table aria-label="DayZ servers" className="server-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Map</th>
              <th>Players</th>
              <th>Ping</th>
              <th>Mods</th>
              <th>View</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {servers.map((server) => {
              const identity = serverIdentity(server);
              const favorite = favoriteIds.has(identity);
              const joining = joiningId === identity;
              return (
                <tr className={styles.row} key={identity}>
                  <td>
                    <div className={styles.serverIdentity}>
                      <button
                        aria-label={favorite ? `Remove ${server.name} from favorites` : `Favorite ${server.name}`}
                        className={favorite ? "star-button active" : "star-button"}
                        onClick={() => onFavorite(server)}
                        type="button"
                      >
                        {favorite ? <FaStar aria-hidden="true" /> : <FaRegStar aria-hidden="true" />}
                      </button>
                      <button
                        aria-label={`View details for ${server.name}`}
                        className={styles.detailsButton}
                        onClick={() => setSelectedServer(server)}
                        type="button"
                      >
                        <div className={styles.nameRow}>
                          <div className="server-name">{server.name}</div>
                          {server.isPassworded ? (
                            <FaKey aria-hidden="true" className={styles.lockIcon} />
                          ) : null}
                        </div>
                      </button>
                    </div>
                  </td>
                  <td>{server.map || "Unknown"}</td>
                  <td className={styles.numeric}>{server.players}/{server.capacity}</td>
                  <td className={`${styles.numeric} ${pingTone(server.ping)}`}>
                    {server.ping === null ? "--" : server.ping}
                  </td>
                  <td className={styles.numeric}>{server.requiredWorkshopIds.length || "0"}</td>
                  <td>{server.firstPersonOnly ? "1PP" : "3PP"}</td>
                  <td className={styles.actionCell}>
                    <div className={styles.joinActions}>
                      <button
                        className="join-button"
                        disabled={joining}
                        onClick={() => onJoin(server)}
                        type="button"
                      >
                        {joining ? "JOINING..." : "JOIN"}
                      </button>
                      <button
                        aria-label={`Open server info for ${server.name}`}
                        className={styles.detailsArrow}
                        onClick={() => setSelectedServer(server)}
                        type="button"
                      >
                        <FaChevronRight aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ServerInfoPanel
        api={api}
        onClose={() => setSelectedServer(null)}
        onJoin={(server) => {
          setSelectedServer(null);
          onJoin(server);
        }}
        open={selectedServer !== null}
        server={selectedServer}
      />
    </>
  );
});
