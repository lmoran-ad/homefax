import type { ReactNode } from "react";

/**
 * The layout container for every signed-in screen. `max-width` narrows on the
 * screens the handoff calls out (claim at 1160, settings at 1000).
 */
export function PageShell({
  children,
  width = 1440,
  className = "",
}: {
  children: ReactNode;
  width?: 1440 | 1160 | 1000;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto px-8 pt-[44px] pb-[90px] ${className}`}
      style={{ maxWidth: width }}
    >
      {children}
    </div>
  );
}

export function PageHeading({
  title,
  lead,
  actions,
}: {
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-[26px] flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="m-0 text-[clamp(28px,4vw,36px)] font-extrabold tracking-[-0.03em] text-ink">
          {title}
        </h1>
        {lead ? (
          <p className="mt-[10px] mb-0 max-w-[680px] text-[15px] leading-[1.6] text-muted">
            {lead}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-[10px]">{actions}</div> : null}
    </div>
  );
}

export function SectionRule({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-[38px] mb-[18px] text-[19px] font-extrabold tracking-[-0.02em] text-ink">
      {children}
    </h2>
  );
}
