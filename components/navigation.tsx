export type LauncherView = "Servers" | "Favorites" | "Recent" | "Mods" | "Settings";

const items: LauncherView[] = ["Servers", "Favorites", "Recent", "Mods", "Settings"];

export function Navigation({
  active,
  onSelect,
}: {
  active: LauncherView;
  onSelect: (view: LauncherView) => void;
}) {
  return (
    <nav className="nav-list" aria-label="Launcher navigation">
      {items.map((item) => (
        <button
          className={active === item ? "nav-item active" : "nav-item"}
          key={item}
          onClick={() => onSelect(item)}
          type="button"
        >
          {item}
        </button>
      ))}
    </nav>
  );
}
