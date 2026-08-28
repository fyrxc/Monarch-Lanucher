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
    <div className="filters-card">
      <div className="filters-primary">
        <input
          aria-label="Search servers"
          className="field search-field"
          onChange={(event) => set("search", event.target.value)}
          placeholder="Search server, map, or IP..."
          value={filters.search}
        />
        <select
          aria-label="Map"
          className="field"
          onChange={(event) => set("map", event.target.value)}
          value={filters.map}
        >
          <option value="">All maps</option>
          {maps.map((map) => (
            <option key={map} value={map}>
              {map}
            </option>
          ))}
        </select>
        <input
          aria-label="Minimum players"
          className="field small-field"
          min="0"
          onChange={(event) => set("minPlayers", numberValue(event.target.value))}
          placeholder="Min players"
          type="number"
          value={filters.minPlayers ?? ""}
        />
        <input
          aria-label="Maximum players"
          className="field small-field"
          min="0"
          onChange={(event) => set("maxPlayers", numberValue(event.target.value))}
          placeholder="Max players"
          type="number"
          value={filters.maxPlayers ?? ""}
        />
        <input
          aria-label="Maximum ping"
          className="field small-field"
          min="0"
          onChange={(event) => set("maxPing", numberValue(event.target.value))}
          placeholder="Max ping"
          type="number"
          value={filters.maxPing ?? ""}
        />
      </div>

      <div className="filters-secondary">
        <label className="check-field">
          <input
            checked={filters.hideEmpty}
            onChange={(event) => set("hideEmpty", event.target.checked)}
            type="checkbox"
          />
          Hide empty
        </label>
        <label className="check-field">
          <input
            checked={filters.hideFull}
            onChange={(event) => set("hideFull", event.target.checked)}
            type="checkbox"
          />
          Hide full
        </label>
        {([
          ["modded", "Modded"],
          ["passworded", "Password"],
          ["official", "Official"],
          ["firstPersonOnly", "1PP"],
        ] as const).map(([key, label]) => (
          <label className="select-field" key={key}>
            <span>{label}</span>
            <select
              onChange={(event) => set(key, parseTriState(event.target.value))}
              value={triStateValue(filters[key])}
            >
              <option value="either">Either</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        ))}
        <span className="result-count">{resultCount.toLocaleString()} servers</span>
        <button className="ghost-button" onClick={onClear} type="button">
          Clear
        </button>
      </div>
    </div>
  );
}
