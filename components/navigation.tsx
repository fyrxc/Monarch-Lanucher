export type LauncherView = "Servers" | "Favorites" | "Recent" | "Mods";

const items: Array<{ view: LauncherView; label: string }> = [
  { view: "Servers", label: "Servers" },
  { view: "Favorites", label: "Favorite" },
  { view: "Recent", label: "Played On" },
  { view: "Mods", label: "Mods" },
];

export function Navigation({
  active,
  onSelect,
}: {
  active: LauncherView;
  onSelect: (view: LauncherView) => void;
}) {
  return (
    <nav className="nav-list" aria-label="Launcher navigation">
      {items.map(({ view, label }) => (
        <button
          className={active === view ? "nav-item active" : "nav-item"}
          key={view}
          onClick={() => onSelect(view)}
          type="button"
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
