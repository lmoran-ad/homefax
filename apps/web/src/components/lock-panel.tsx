import Link from "next/link";
import type { ContributeState } from "@homefax/contracts";

/**
 * What stands in for a gated tab.
 *
 * The API refuses these actions regardless of what the UI shows — this panel
 * renders straight from `contributeState`, so the wording and the CTA always
 * match the reason the server would give.
 */
export function LockPanel({
  contribute,
  tokenId,
}: {
  contribute: ContributeState;
  tokenId: string;
}) {
  const href =
    contribute.ctaAction === "jobs"
      ? "/jobs"
      : contribute.ctaAction === null
        ? "/login"
        : `/properties/${tokenId}/claim`;

  return (
    <div
      data-testid="lock-panel"
      data-action={contribute.ctaAction ?? "none"}
      className="mx-auto max-w-[560px] rounded-[16px] border border-line bg-white px-8 py-[56px] text-center"
    >
      <div
        className="mx-auto flex h-[46px] w-[46px] items-center justify-center rounded-full bg-card text-[20px]"
        aria-hidden="true"
      >
        🔒
      </div>
      <h2
        data-testid="lock-title"
        className="mt-[20px] mb-0 text-[21px] font-extrabold tracking-[-0.02em] text-ink"
      >
        {contribute.title}
      </h2>
      <p className="mx-auto mt-[12px] mb-0 max-w-[440px] text-[14.5px] leading-[1.6] text-muted">
        {contribute.body}
      </p>
      {contribute.ctaLabel ? (
        <Link
          href={href}
          data-testid="lock-cta"
          className="mt-[24px] inline-flex items-center justify-center rounded-[9px] bg-brand px-[20px] py-[12px] text-[14px] font-bold text-white no-underline hover:bg-brand-hover hover:text-white"
        >
          {contribute.ctaLabel}
        </Link>
      ) : null}
      <p className="mt-[22px] mb-0 text-[12.5px] text-faint">
        Overview, Timeline and Documents stay readable. Only contributing is locked.
      </p>
    </div>
  );
}
