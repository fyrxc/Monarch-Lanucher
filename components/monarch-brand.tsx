import {
  MONARCH_M_LOGO_DATA_URL,
  MONARCH_WORDMARK_DATA_URL,
} from "../lib/branding";

export function MonarchBrand({
  className = "",
  ariaLabel = "Monarch brand",
}: {
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className={`monarch-brand ${className}`.trim()}
    >
      <img className="monarch-brand-m" src={MONARCH_M_LOGO_DATA_URL} alt="Monarch M" />
      <img className="monarch-brand-word" src={MONARCH_WORDMARK_DATA_URL} alt="onarch" />
    </div>
  );
}
