"use client";

import { useEffect, useState } from "react";
import { isDefaultDayzWorkshopPreview } from "../lib/workshop-preview";
import styles from "./monarch-mod-preview.module.css";

export function MonarchModPreview({ src, alt }: { src: string | null; alt: string }) {
  const [fallback, setFallback] = useState(!src);

  useEffect(() => setFallback(!src), [src]);

  if (fallback) {
    return <img alt={`${alt} fallback`} className={styles.fallback} src="/branding/LogoWhite.svg" />;
  }

  return (
    <img
      alt={alt}
      className={styles.preview}
      onError={() => setFallback(true)}
      onLoad={(event) => {
        if (isDefaultDayzWorkshopPreview(event.currentTarget)) setFallback(true);
      }}
      src={src ?? undefined}
    />
  );
}
