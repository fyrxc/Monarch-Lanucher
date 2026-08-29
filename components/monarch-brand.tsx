export function MonarchBrand({
  className = "",
  ariaLabel = "Monarch brand",
}: {
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div aria-label={ariaLabel} className={className}>
      <img src="/branding/LogoWhite.svg" alt="Monarch M" />
      <img src="/branding/onarch.svg" alt="onarch" />
    </div>
  );
}
