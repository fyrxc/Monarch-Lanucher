import { memo } from "react";
import { FiCopy, FiKey, FiStar } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import type { DayzServer } from "../lib/models";
import { serverIdentity } from "../lib/server-id";

function copyAddress(address: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    void navigator.clipboard.writeText(address);
  }
}

function pingTone(ping: number | null): "good" | "fair" | "high" | "bad" | "unknown" {
  if (ping === null) return "unknown";
  if (ping <= 80) return "good";
  if (ping <= 140) return "fair";
  if (ping <= 200) return "high";
  return "bad";
}

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
            const address = `${server.ip}:${server.gamePort}`;
            return (
              <tr key={identity}>
                <td className="favorite-cell">
                  <button
                    aria-label={favorite ? `Remove ${server.name} from favorites` : `Favorite ${server.name}`}
                    className={favorite ? "star-button active" : "star-button"}
                    onClick={() => onFavorite(server)}
                    type="button"
                  >
                    {favorite ? <FaStar aria-hidden /> : <FiStar aria-hidden />}
                  </button>
                </td>
                <td>
                  <div className="server-name-line">
                    <div className="server-name">{server.name}</div>
                    {server.isPassworded ? (
                      <span className="server-lock" aria-label="Password protected" title="Password protected">
                        <FiKey aria-hidden />
                      </span>
                    ) : null}
                  </div>
                  <div className="server-address-line">
                    <span className="server-address">{address}</span>
                    <button
                      aria-label={`Copy ${address}`}
                      className="server-copy-button"
                      onClick={() => copyAddress(address)}
                      title={`Copy ${address}`}
                      type="button"
                    >
                      <FiCopy aria-hidden />
                    </button>
                  </div>
                </td>
                <td>{server.map}</td>
                <td>{server.players} / {server.capacity}</td>
                <td>
                  <span className="ping-value" data-tone={pingTone(server.ping)}>
                    {server.ping === null ? "--" : `${server.ping} ms`}
                  </span>
                </td>
                <td>{server.requiredWorkshopIds.length || "Vanilla"}</td>
                <td>{server.firstPersonOnly ? "1PP" : "3PP"}</td>
                <td className="join-cell">
                  <button
                    className="join-button"
                    disabled={joining}
                    onClick={() => onJoin(server)}
                    type="button"
                  >
                    {joining ? "JOINING..." : "JOIN"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
