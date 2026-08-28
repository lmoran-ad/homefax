/**
 * The logo mark: a red chevron roof over an outlined house carrying a single
 * ledger line — property plus record. Navy tile with white strokes in the app
 * header, white tile with navy strokes on the navy login panel.
 */
export function LogoMark({
  size = 30,
  variant = "navy",
}: {
  size?: number;
  variant?: "navy" | "white";
}) {
  const tile = variant === "navy" ? "#12395f" : "#ffffff";
  const house = variant === "navy" ? "#ffffff" : "#0b2c52";
  const glyph = Math.round(size * 0.63);

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[8px]"
      style={{ width: size, height: size, background: tile }}
    >
      <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3.4 10.6 12 4.1l8.6 6.5"
          stroke="#e4002b"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.2 11.9v7.4h11.6v-7.4"
          stroke={house}
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9.6 15.6h4.8" stroke={house} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/**
 * Placeholder for the REAL / REMAX lockup. Replace with the official brand
 * asset from the brand system before this goes anywhere near a customer.
 */
export function BrandLockup({ tone = "ink" }: { tone?: "ink" | "white" }) {
  const color = tone === "ink" ? "#12222f" : "#ffffff";
  return (
    <div
      className="flex items-center gap-1 text-[13px] font-extrabold tracking-[-0.01em] whitespace-nowrap"
      style={{ color }}
    >
      REAL
      <span className="flex gap-[2px]">
        <span
          className="h-3 w-1"
          style={{ background: "#e4002b", transform: "skewX(-18deg)" }}
        />
        <span
          className="h-3 w-1"
          style={{ background: "#1a4f9c", transform: "skewX(-18deg)" }}
        />
      </span>
      REMAX
    </div>
  );
}

export function LogoCluster({
  size = 30,
  variant = "navy",
  showLockup = false,
  tone = "ink",
}: {
  size?: number;
  variant?: "navy" | "white";
  showLockup?: boolean;
  tone?: "ink" | "white";
}) {
  return (
    <div className="flex shrink-0 items-center gap-[11px]">
      <LogoMark size={size} variant={variant} />
      <div
        className="text-[19px] font-extrabold tracking-[-0.02em]"
        style={{ color: tone === "ink" ? "#12222f" : "#ffffff" }}
      >
        HomeToken
      </div>
      {showLockup ? (
        <>
          <div className="h-[18px] w-px" style={{ background: tone === "ink" ? "#e3e7ec" : "#ffffff33" }} />
          <BrandLockup tone={tone} />
        </>
      ) : null}
    </div>
  );
}

/**
 * Property photography is not part of this build. The placeholder is labelled
 * so nobody mistakes it for a design choice — real listing photos replace it.
 */
export function PhotoPlaceholder({
  className = "",
  label = "PHOTO PLACEHOLDER",
  children,
}: {
  className?: string;
  label?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`dot-grid-photo relative flex items-center justify-center overflow-hidden ${className}`}
    >
      <span className="text-[10.5px] font-bold tracking-[0.16em] text-white/45">
        {label}
      </span>
      {children}
    </div>
  );
}
