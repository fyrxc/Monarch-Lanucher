import { memo, useState } from "react";
import { FaRegStar, FaStar } from "react-icons/fa";
import { FaChevronRight, FaKey } from "react-icons/fa6";
import type { DayzServer } from "../lib/models";
import { serverIdentity } from "../lib/server-id";
import { ServerInfoPanel } from "./server-info-panel";
import styles from "./server-table.module.css";

export const ServerTable = memo(function ServerTable({
  servers,
  favoriteIds,
  joiningId,
  onFavorite,
  onJoin,
}: {
  servers: DayzServer[];
  favoriteIds: ReadonlySet<string>;
  joiningId: string | null;
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
        <table className="server-table">
          <thead>
            <tr>
              <th aria-label="Favorite" />
              <th>Server</th>
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
              const identity = serverIdentity(server);
              const favorite = favoriteIds.has(identity);
              const joining = joiningId === identity;
              return (
                <tr key={identity}>
                  <td className="favorite-cell">
                    <button
                      aria-label={favorite ? `Remove ${server.name} from favorites` : `Favorite ${server.name}`}
                      className={favorite ? "star-button active" : "star-button"}
                      onClick={() => onFavorite(server)}
                      type="button"
                    >
                      {favorite ? <FaStar aria-hidden="true" /> : <FaRegStar aria-hidden="true" />}
                    </button>
                  </td>
                  <td>
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
                      <div className="server-address">{server.ip}:{server.gamePort}</div>
                    </button>
                  </td>
                  <td>{server.map}</td>
                  <td>{server.players} / {server.capacity}</td>
                  <td>{server.ping === null ? "--" : `${server.ping} ms`}</td>
                  <td>{server.requiredWorkshopIds.length || "Vanilla"}</td>
                  <td>{server.firstPersonOnly ? "1PP" : "3PP"}</td>
                  <td className="join-cell">
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
