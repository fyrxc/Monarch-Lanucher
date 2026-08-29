"use client";

import { useEffect, useState } from "react";
import { MONARCH_M_LOGO_DATA_URL } from "../lib/branding";
import { isDefaultDayzWorkshopPreview } from "../lib/workshop-preview";

export function ModPreview({
  previewUrl,
  imageClassName,
  fallbackClassName,
}: {
  previewUrl: string | null;
  imageClassName: string;
  fallbackClassName: string;
}) {
  const [fallback, setFallback] = useState(!previewUrl);

  useEffect(() => {
    setFallback(!previewUrl);
  }, [previewUrl]);

  if (!previewUrl || fallback) {
    return (
      <div className={fallbackClassName} aria-label="Monarch logo fallback" role="img">
        <img src={MONARCH_M_LOGO_DATA_URL} alt="" />
      </div>
    );
  }

  return (
    <img
      className={imageClassName}
      crossOrigin="anonymous"
      data-testid="workshop-preview"
      src={previewUrl}
      alt=""
      loading="lazy"
      onError={() => setFallback(true)}
      onLoad={(event) => {
        if (isDefaultDayzWorkshopPreview(event.currentTarget)) setFallback(true);
      }}
    />
  );
}
