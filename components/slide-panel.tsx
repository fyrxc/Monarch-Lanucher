"use client";

import type { ReactNode } from "react";
import { IoClose } from "react-icons/io5";

export function SlidePanel({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className={open ? "slide-layer open" : "slide-layer"} aria-hidden={!open}>
      <div className="slide-scrim" onClick={onClose} />
      <aside aria-label={title} aria-modal="true" className="slide-panel" role="dialog">
        <header className="slide-panel-header">
          <h2>{title}</h2>
          <button
            aria-label={`Close ${title}`}
            className="slide-panel-close"
            onClick={onClose}
            type="button"
          >
            <IoClose aria-hidden="true" />
          </button>
        </header>
        <div className="slide-panel-body">{children}</div>
      </aside>
    </div>
  );
}
