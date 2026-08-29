import { memo } from "react";
import { FaRegStar, FaStar } from "react-icons/fa";
import { IoChevronForward } from "react-icons/io5";
import type { DayzServer } from "../lib/models";
import { serverIdentity } from "../lib/server-id";

export const ServerTable = memo(function ServerTable({
  servers,
  favoriteIds,
  joiningId,
  onFavorite,
  onJoin,
  onDetails,
}: {
  servers: DayzServer[];
  favoriteIds: ReadonlySet<string>;
  joiningId: string | null;
  onFavorite: (server: DayzServer) => void;
  onJoin: (server: DayzServer) => void;
  onDetails: (server: DayzServer) => void;
}) {
  if (servers.length === 0) {
    return <div className="empty-state">No servers match your filters.</div>;
  }

  return (
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
                <td className="server-main-cell">
                  <button
                    aria-label={`View ${server.name} server info`}
                    className="server-details-hitbox"
                    onClick={() => onDetails(server)}
                    type="button"
                  >
                    <span className="server-name">{server.name}</span>
                    <span className="server-address">
                      {server.country || "--"} · {server.ip}:{server.gamePort}
                    </span>
                  </button>
                </td>
                <td>{server.map}</td>
                <td>{server.players} / {server.capacity}</td>
                <td>{server.ping === null ? "--" : `${server.ping} ms`}</td>
                <td>{server.requiredWorkshopIds.length || "Vanilla"}</td>
                <td>{server.firstPersonOnly ? "1PP" : "3PP"}</td>
                <td className="join-cell">
                  <div className="server-row-actions">
                    <button
                      className="join-button"
                      disabled={joining}
                      onClick={() => onJoin(server)}
                      type="button"
                    >
                      {joining ? "JOINING..." : "JOIN"}
                    </button>
                    <button
                      aria-label={`View ${server.name} server info`}
                      className="server-info-button"
                      onClick={() => onDetails(server)}
                      type="button"
                    >
                      <IoChevronForward aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
