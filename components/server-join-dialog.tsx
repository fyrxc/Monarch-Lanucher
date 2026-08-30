import { FiCopy, FiKey, FiRefreshCw, FiX } from "react-icons/fi";
import type { DayzServer, RequiredMod } from "../lib/models";

function stateLabel(state: RequiredMod["state"]) {
  switch (state) {
    case "installed":
      return "Installed";
    case "missing":
      return "Missing";
    case "updating":
      return "Updating";
  }
}

function copyAddress(address: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    void navigator.clipboard.writeText(address);
  }
}

export function ServerJoinDialog({
  server,
  requiredMods,
  password,
  loading,
  syncing,
  joining,
  error,
  onPasswordChange,
  onSync,
  onRefresh,
  onJoin,
  onClose,
}: {
  server: DayzServer;
  requiredMods: RequiredMod[];
  password: string;
  loading: boolean;
  syncing: boolean;
  joining: boolean;
  error: string | null;
  onPasswordChange: (password: string) => void;
  onSync: () => void;
  onRefresh: () => void;
  onJoin: () => void;
  onClose: () => void;
}) {
  const address = `${server.ip}:${server.gamePort}`;
  const hasMissing = requiredMods.some((mod) => mod.state === "missing");
  const hasUpdating = requiredMods.some((mod) => mod.state === "updating");
  const allReady = !loading && !hasMissing && !hasUpdating;
  const passwordReady = !server.isPassworded || password.trim().length > 0;

  return (
    <div className="join-dialog-backdrop" onMouseDown={onClose}>
      <section
        aria-label={`Join ${server.name}`}
        aria-modal="true"
        className="join-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="join-dialog-header">
          <div>
            <span className="join-dialog-eyebrow">SERVER PREFLIGHT</span>
            <div className="join-dialog-title-line">
              <h2>{server.name}</h2>
              {server.isPassworded ? (
                <span className="server-lock" aria-label="Password protected" title="Password protected">
                  <FiKey aria-hidden />
                </span>
              ) : null}
            </div>
            <div className="join-dialog-address">
              <span>{address}</span>
              <button
                aria-label={`Copy ${address}`}
                className="server-copy-button"
                onClick={() => copyAddress(address)}
                type="button"
              >
                <FiCopy aria-hidden />
              </button>
            </div>
          </div>
          <button aria-label="Close join dialog" className="dialog-close-button" onClick={onClose} type="button">
            <FiX aria-hidden />
          </button>
        </header>

        {server.isPassworded ? (
          <label className="join-password-field">
            <span>Server Password</span>
            <div className="join-password-input-wrap">
              <FiKey aria-hidden />
              <input
                autoComplete="off"
                className="field"
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="Enter server password"
                type="password"
                value={password}
              />
            </div>
          </label>
        ) : null}

        <div className="join-mods-heading">
          <div>
            <h3>Required Mods</h3>
            <p>Monarch checks Steam Workshop before DayZ launches.</p>
          </div>
          {!loading && requiredMods.length > 0 ? (
            <button className="dialog-refresh-button" onClick={onRefresh} type="button">
              <FiRefreshCw aria-hidden />
              Refresh
            </button>
          ) : null}
        </div>

        <div className="join-mod-list">
          {loading ? (
            <div className="join-mod-empty">Checking required Workshop mods...</div>
          ) : requiredMods.length === 0 ? (
            <div className="join-mod-empty">No Workshop mods required.</div>
          ) : (
            requiredMods.map((mod) => (
              <div className="join-mod-row" key={mod.workshopId}>
                <div className="join-mod-art">
                  {mod.previewUrl ? <img alt="" src={mod.previewUrl} /> : <span>M</span>}
                </div>
                <div className="join-mod-copy">
                  <strong>{mod.name}</strong>
                  <span>Workshop ID {mod.workshopId}</span>
                </div>
                <span className="join-mod-state" data-state={mod.state}>
                  {stateLabel(mod.state)}
                </span>
              </div>
            ))
          )}
        </div>

        {error ? <div className="join-dialog-error">{error}</div> : null}

        <footer className="join-dialog-footer">
          <button className="ghost-button" onClick={onClose} type="button">
            CANCEL
          </button>
          {hasMissing ? (
            <button className="join-button dialog-primary" disabled={syncing} onClick={onSync} type="button">
              {syncing ? "SETTING UP..." : "SETUP MODS"}
            </button>
          ) : hasUpdating ? (
            <button className="join-button dialog-primary" disabled={loading || syncing} onClick={onRefresh} type="button">
              CHECK AGAIN
            </button>
          ) : (
            <button
              className="join-button dialog-primary"
              disabled={!allReady || !passwordReady || joining}
              onClick={onJoin}
              type="button"
            >
              {joining ? "JOINING..." : "JOIN SERVER"}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
