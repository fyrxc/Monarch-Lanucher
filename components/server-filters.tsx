import type { ServerFilters } from "../lib/filters";

function triStateValue(value: boolean | null): string {
  return value === null ? "either" : value ? "yes" : "no";
}

function parseTriState(value: string): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

export function ServerFiltersPanel({
  filters,
  maps,
  resultCount,
  onChange,
  onClear,
}: {
  filters: ServerFilters;
  maps: string[];
  resultCount: number;
  onChange: (next: ServerFilters) => void;
  onClear: () => void;
}) {
  const set = <K extends keyof ServerFilters>(key: K, value: ServerFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const numberValue = (value: string) => (value.trim() === "" ? null : Number(value));

  return (
    <section className="server-filter-panel" role="region" aria-label="Server filters">
      <div className="server-filter-options">
        <span className="server-filter-kicker">FILTER OPTIONS</span>
        <label>
          <input
            checked={filters.hideEmpty}
            onChange={(event) => set("hideEmpty", event.target.checked)}
            type="checkbox"
          />
          Hide Empty
        </label>
        <label>
          <input
            checked={filters.hideFull}
            onChange={(event) => set("hideFull", event.target.checked)}
            type="checkbox"
          />
          Hide Full
        </label>
        <label>
          <span>Mods</span>
          <select
            aria-label="Modded"
            onChange={(event) => set("modded", parseTriState(event.target.value))}
            value={triStateValue(filters.modded)}
          >
            <option value="either">Any</option>
            <option value="yes">Modded</option>
            <option value="no">Vanilla</option>
          </select>
        </label>
        <label>
          <span>Official</span>
          <select
            aria-label="Official"
            onChange={(event) => set("official", parseTriState(event.target.value))}
            value={triStateValue(filters.official)}
          >
            <option value="either">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label>
          <span>View</span>
          <select
            aria-label="1PP"
            onChange={(event) => set("firstPersonOnly", parseTriState(event.target.value))}
            value={triStateValue(filters.firstPersonOnly)}
          >
            <option value="either">Any</option>
            <option value="yes">1PP</option>
            <option value="no">3PP</option>
          </select>
        </label>
        <label>
          <span>Password</span>
          <select
            aria-label="Password"
            onChange={(event) => set("passworded", parseTriState(event.target.value))}
            value={triStateValue(filters.passworded)}
          >
            <option value="either">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>

      <div className="server-filter-main">
        <div className="server-filter-search-row">
          <input
            aria-label="Search servers"
            className="monarch-input server-search-input"
            onChange={(event) => set("search", event.target.value)}
            placeholder="Search"
            value={filters.search}
          />
          <select
            aria-label="Map"
            className="monarch-input server-map-input"
            onChange={(event) => set("map", event.target.value)}
            value={filters.map}
          >
            <option value="">Map - Select</option>
            {maps.map((map) => (
              <option key={map} value={map}>
                {map}
              </option>
            ))}
          </select>
        </div>

        <div className="server-filter-number-row">
          <input
            aria-label="Minimum players"
            className="monarch-input"
            min="0"
            onChange={(event) => set("minPlayers", numberValue(event.target.value))}
            placeholder="Min players"
            type="number"
            value={filters.minPlayers ?? ""}
          />
          <input
            aria-label="Maximum players"
            className="monarch-input"
            min="0"
            onChange={(event) => set("maxPlayers", numberValue(event.target.value))}
            placeholder="Max players"
            type="number"
            value={filters.maxPlayers ?? ""}
          />
          <input
            aria-label="Maximum ping"
            className="monarch-input"
            min="0"
            onChange={(event) => set("maxPing", numberValue(event.target.value))}
            placeholder="Max ping"
            type="number"
            value={filters.maxPing ?? ""}
          />
        </div>

        <div className="server-filter-footer">
          <span>{resultCount.toLocaleString()} servers</span>
          <button className="monarch-text-button" onClick={onClear} type="button">
            Clear Filters
          </button>
        </div>
      </div>
    </section>
  );
}
