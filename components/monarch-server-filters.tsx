import type { ServerFilters } from "../lib/filters";
import styles from "./monarch-server-filters.module.css";

function numberValue(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function triState(value: string): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

export function MonarchServerFilters({
  filters,
  maps,
  onChange,
  onClear,
}: {
  filters: ServerFilters;
  maps: string[];
  onChange: (filters: ServerFilters) => void;
  onClear: () => void;
}) {
  const patch = <K extends keyof ServerFilters>(key: K, value: ServerFilters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <section aria-label="Server filters" className={styles.panel}>
      <div className={styles.side}>
        <div className={styles.sideTitle}>ADVANCED</div>
        <label><input checked={filters.hideEmpty} onChange={(e) => patch("hideEmpty", e.target.checked)} type="checkbox" /> Hide Empty</label>
        <label><input checked={filters.hideFull} onChange={(e) => patch("hideFull", e.target.checked)} type="checkbox" /> Hide Full</label>
        <label><input checked={filters.favoritesOnly} onChange={(e) => patch("favoritesOnly", e.target.checked)} type="checkbox" /> Favorites</label>
      </div>

      <div className={styles.controls}>
        <div className={styles.topRow}>
          <input
            aria-label="Search servers"
            className={styles.search}
            onChange={(e) => patch("search", e.target.value)}
            placeholder="Search"
            value={filters.search}
          />
          <select aria-label="Map" className={styles.map} onChange={(e) => patch("map", e.target.value)} value={filters.map}>
            <option value="">Map - All Maps</option>
            {maps.map((map) => <option key={map} value={map}>{map}</option>)}
          </select>
        </div>

        <div className={styles.bottomRow}>
          <input aria-label="Min players" inputMode="numeric" onChange={(e) => patch("minPlayers", numberValue(e.target.value))} placeholder="Min Players" value={filters.minPlayers ?? ""} />
          <input aria-label="Max players" inputMode="numeric" onChange={(e) => patch("maxPlayers", numberValue(e.target.value))} placeholder="Max Players" value={filters.maxPlayers ?? ""} />
          <input aria-label="Max ping" inputMode="numeric" onChange={(e) => patch("maxPing", numberValue(e.target.value))} placeholder="Max Ping" value={filters.maxPing ?? ""} />
          <select aria-label="Modded" onChange={(e) => patch("modded", triState(e.target.value))} value={filters.modded === null ? "either" : filters.modded ? "yes" : "no"}>
            <option value="either">Modded - Either</option><option value="yes">Modded</option><option value="no">Vanilla</option>
          </select>
          <select aria-label="Password" onChange={(e) => patch("passworded", triState(e.target.value))} value={filters.passworded === null ? "either" : filters.passworded ? "yes" : "no"}>
            <option value="either">Password - Either</option><option value="yes">Locked</option><option value="no">Open</option>
          </select>
          <select aria-label="Official" onChange={(e) => patch("official", triState(e.target.value))} value={filters.official === null ? "either" : filters.official ? "yes" : "no"}>
            <option value="either">Official - Either</option><option value="yes">Official</option><option value="no">Community</option>
          </select>
          <select aria-label="Perspective" onChange={(e) => patch("firstPersonOnly", triState(e.target.value))} value={filters.firstPersonOnly === null ? "either" : filters.firstPersonOnly ? "yes" : "no"}>
            <option value="either">1PP - Either</option><option value="yes">1PP</option><option value="no">3PP</option>
          </select>
          <button className={styles.clear} onClick={onClear} type="button">Clear</button>
        </div>
      </div>
    </section>
  );
}
