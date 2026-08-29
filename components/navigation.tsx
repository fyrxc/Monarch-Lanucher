import { FaRegStar } from "react-icons/fa";
import { FiSettings } from "react-icons/fi";
import { MdHistory } from "react-icons/md";
import { RiServerLine } from "react-icons/ri";
import { VscExtensions } from "react-icons/vsc";

export type LauncherView = "Servers" | "Favorites" | "Recent" | "Mods" | "Settings";

const items: Array<{ view: LauncherView; icon: typeof RiServerLine }> = [
  { view: "Servers", icon: RiServerLine },
  { view: "Favorites", icon: FaRegStar },
  { view: "Recent", icon: MdHistory },
  { view: "Mods", icon: VscExtensions },
  { view: "Settings", icon: FiSettings },
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
      {items.map(({ view, icon: Icon }) => {
        const selected = active === view;
        return (
          <button
            aria-current={selected ? "page" : undefined}
            className={selected ? "nav-item active" : "nav-item"}
            key={view}
            onClick={() => onSelect(view)}
            type="button"
          >
            <Icon aria-hidden="true" className="nav-icon" />
            <span>{view}</span>
          </button>
        );
      })}
    </nav>
  );
}
