"use client";

import { useEffect } from "react";
import { isClickableTarget, playLauncherClick } from "./click-sound";

export function useGlobalClickSound(): void {
  useEffect(() => {
    const handler = (event: PointerEvent) => {
      if (isClickableTarget(event.target)) playLauncherClick();
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, []);
}
