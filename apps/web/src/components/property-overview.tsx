import Link from "next/link";
import type {
  Claim,
  HealthScore,
  LedgerState,
  OwnershipPeriod,
  PropertyDetail,
  PropertyEvent,
  PropertySystem,
} from "@homefax/contracts";
import { healthArcDegrees } from "@homefax/contracts";
import { StatusPill, VerificationBadge } from "./ui";
import { formatDate, formatMoney, SYSTEM_STATUS } from "@/lib/format";

/** 132px conic donut with a 104px well. The arc is score × 3.6deg, nothing else. */
export function HealthDonut({ health }: { health: HealthScore }) {
  const degrees = healthArcDegrees(health.score);
  return (
    <div className="flex flex-col items-center">
      <div
        data-testid="health-donut"
        data-score={health.score}
        className="flex h-[132px] w-[132px] items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(#12693b ${degrees}deg, #eef1f4 0)`,
        }}
        role="img"
        aria-label={`Home Health ${health.score} out of 100`}
      >
        <div className="flex h-[104px] w-[104px] flex-col items-center justify-center rounded-full bg-white">
          <div
            data-testid="health-score"
            className="text-[38px] leading-none font-extrabold tracking-[-0.03em] text-ink"
          >
            {health.score}
          </div>
          <div className="mt-[2px] text-[11px] font-bold tracking-[0.1em] text-softer">
            /100
          </div>
        </div>
      </div>
      <div className="mt-[14px]">
        <span
          data-testid="health-confidence"
          className="rounded-[999px] px-[11px] py-[4px] text-[11.5px] font-bold"
          style={{
            background:
              health.confidence === "High"
                ? "#e7f4ec"
                : health.confidence === "Medium"
                  ? "#fdf3e2"
                  : "#f1f3f5",
            color:
              health.confidence === "High"
                ? "#12693b"
                : health.confidence === "Medium"
                  ? "#8a5a06"
                  : "#6b7580",
          }}
        >
          {health.confidence} confidence · {health.knownSystems} of{" "}
          {health.totalSystems} known
        </span>
      </div>
    </div>
  );
}

export function HealthCard({ health }: { health: HealthScore }) {
  return (
    <section className="rounded-[16px] border border-line bg-white p-[24px_26px]">
      <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        Home Health
      </h2>
      <div className="mt-[20px]">
        <HealthDonut health={health} />
      </div>
      <p className="mt-[18px] mb-0 text-[13px] leading-[1.6] text-muted">
        A weighted read of the recorded condition of six major systems. Deterministic
        and calculated from the record — no model is involved.
      </p>

      <div className="mt-[18px] space-y-[9px]">
        {health.bars.map((bar) => (
          <div
            key={bar.key}
            // 104px rather than the handoff's 96px: "Foundation · 15" is the
            // longest label and truncated at 96.
            className="track-min-0 grid grid-cols-[104px_1fr_42px] items-center gap-[10px]"
          >
            <div className="truncate text-[12px] font-semibold text-body">
              {bar.label}
            </div>
            <div className="h-[7px] overflow-hidden rounded-full bg-line-light">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${bar.pct}%`,
                  background: SYSTEM_STATUS[bar.status].dot,
                }}
              />
            </div>
            <div className="text-right text-[12px] font-bold text-muted">
              {bar.points}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-[18px] mb-0 border-t border-line-light pt-[14px] text-[12px] leading-[1.55] text-faint">
        Home Health reflects only what this record contains. Missing records reduce
        confidence. It is not a home inspection and not an appraisal.
      </p>
    </section>
  );
}

export function LedgerBar({
  ledger,
  action,
}: {
  ledger: LedgerState;
  action?: React.ReactNode;
}) {
  const valid = ledger.valid;
  return (
    <section
      data-testid="ledger-bar"
      data-valid={valid}
      className="flex flex-wrap items-center gap-[16px] rounded-[16px] p-[18px_22px]"
      style={{
        background: valid ? "#e7f4ec" : "#fdecee",
        border: `1px solid ${valid ? "#cfe6d9" : "#f5c2c8"}`,
      }}
    >
      <div
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[16px] font-bold text-white"
        style={{ background: valid ? "#12693b" : "#a8102a" }}
        aria-hidden="true"
      >
        {valid ? "✓" : "!"}
      </div>
      <div className="min-w-0 flex-1">
        <div
          data-testid="ledger-status"
          className="text-[15.5px] font-bold"
          style={{ color: valid ? "#12693b" : "#a8102a" }}
        >
          {valid ? "Ledger Verified" : "Ledger Integrity Warning"}
        </div>
        <div data-testid="ledger-count" className="mt-[3px] text-[13px] text-body">
          {valid ? (
            <>
              {ledger.checkedEvents} events checked · SHA-256 hash chain intact ·
              last verified {ledger.verifiedAt}
            </>
          ) : (
            <>
              Event {ledger.invalidEventId} does not match its recorded hash. The
              record has been altered after it was committed.
            </>
          )}
        </div>
        {ledger.genesisDate ? (
          <div className="mt-[3px] text-[12px] text-muted">
            Genesis {formatDate(ledger.genesisDate)}
          </div>
        ) : null}
      </div>
      {action}
    </section>
  );
}

export function SystemsGrid({
  systems,
  tokenId,
  showFindAPro,
}: {
  systems: PropertySystem[];
  tokenId: string;
  showFindAPro: boolean;
}) {
  const visible = systems.filter((system) => !system.hidden);

  return (
    <div className="track-min-0 grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
      {visible.map((system) => {
        const needsAttention =
          system.status === "WATCH" || system.status === "ATTENTION";
        return (
          <article
            key={system.key}
            data-testid="system-card"
            data-system={system.key}
            data-status={system.status}
            className="flex min-w-0 flex-col rounded-[14px] bg-white p-[18px_20px]"
            style={{
              border: `1px solid ${needsAttention ? "#f0dcb8" : "#e3e7ec"}`,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="m-0 text-[16px] font-bold tracking-[-0.015em] text-ink">
                {system.name}
              </h3>
              <StatusPill status={system.status} testId="system-status" />
            </div>

            <dl className="mt-[14px] mb-0 space-y-[7px]">
              {system.rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 text-[13px]">
                  <dt className="shrink-0 text-muted">{label}</dt>
                  <dd className="m-0 truncate text-right font-semibold text-ink">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="flex-1" />

            <div className="mt-[16px] flex flex-wrap items-center gap-[10px] border-t border-line-light pt-[12px]">
              <VerificationBadge level={system.verificationLevel} />
              {showFindAPro && needsAttention ? (
                <Link
                  href={`/pros?trade=${encodeURIComponent(system.name)}`}
                  className="text-[12.5px] font-bold text-link no-underline hover:text-brand"
                >
                  Find a pro
                </Link>
              ) : null}
              {system.sourceEventId ? (
                <Link
                  href={`/properties/${tokenId}/timeline#ev-${system.sourceEventId}`}
                  data-testid="source-event-link"
                  className="ml-auto text-[12.5px] font-semibold text-link no-underline hover:text-brand"
                >
                  Source event →
                </Link>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function StewardshipBar({
  claim,
  claimStateKey,
  action,
}: {
  claim: Claim | null;
  claimStateKey: string;
  action?: React.ReactNode;
}) {
  const state =
    claimStateKey === "active"
      ? {
          bg: "#eef7f1",
          line: "#cfe6d9",
          label: "STEWARDSHIP ACTIVE",
          title: claim?.mlsNumber
            ? `Stewardship active · MLS ${claim.mlsNumber}`
            : "Stewardship active",
          detail: claim?.expiresAt
            ? `Expires ${formatDate(claim.expiresAt)} · ${claim.daysUntilExpiry} days remaining. Claims are time-boxed and non-exclusive.`
            : "Claims are time-boxed and non-exclusive.",
        }
      : claimStateKey === "pending"
        ? {
            bg: "#fffaf1",
            line: "#f2dcb4",
            label: "CLAIM PENDING",
            title: "Waiting on the owner of record",
            detail:
              "A consent request has been sent. Until the owner responds this record is read-only for you.",
          }
        : {
            bg: "#f8fafb",
            line: "#e3e7ec",
            label: "UNCLAIMED",
            title: "Seeded from county records, not yet claimed",
            detail:
              "The record already exists. Claiming grants authorization over it — it does not create it.",
          };

  return (
    <section
      data-testid="stewardship-bar"
      data-state={claimStateKey}
      className="flex flex-wrap items-center gap-[16px] rounded-[16px] p-[18px_22px]"
      style={{ background: state.bg, border: `1px solid ${state.line}` }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] font-bold tracking-[0.14em] text-softer">
          {state.label}
        </div>
        <div className="mt-[6px] text-[15px] font-bold text-ink">{state.title}</div>
        <div className="mt-[3px] text-[13px] leading-[1.5] text-muted">
          {state.detail}
        </div>
      </div>
      {action}
    </section>
  );
}

export function OwnershipCard({ periods }: { periods: OwnershipPeriod[] }) {
  return (
    <section className="rounded-[16px] border border-line bg-white p-[24px_26px]">
      <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        Ownership periods
      </h2>
      <div className="mt-[16px] space-y-[10px]">
        {periods.map((period) => (
          <div
            key={period.sequenceNumber}
            data-testid="ownership-period"
            className="rounded-[12px] p-[14px_16px]"
            style={{
              background: period.isCurrent ? "#f2f7fd" : "#f8fafb",
              border: `1px solid ${period.isCurrent ? "#cfe0f5" : "#eef1f4"}`,
            }}
          >
            <div className="text-[14px] font-bold text-ink">{period.label}</div>
            <div className="mt-[3px] text-[13px] text-muted">{period.range}</div>
          </div>
        ))}
      </div>
      <p className="mt-[16px] mb-0 text-[12px] leading-[1.55] text-faint">
        Prior owners are never named in the property record.
      </p>
    </section>
  );
}

export function SalesAndTaxCard({ events }: { events: PropertyEvent[] }) {
  const sales = events.filter((event) => event.eventType === "SALE");
  const taxes = events
    .filter((event) => event.eventType === "TAX_ASSESSMENT")
    .slice(0, 4);

  return (
    <section className="rounded-[16px] border border-line bg-white p-[24px_26px]">
      <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        Sales &amp; tax record
      </h2>

      <div className="mt-[16px]">
        <div className="text-[10.5px] font-bold tracking-[0.14em] text-softer">
          SALES
        </div>
        {sales.length === 0 ? (
          <p className="mt-[8px] mb-0 text-[13px] text-faint">No sales recorded.</p>
        ) : (
          <div className="mt-[8px] space-y-[7px]">
            {sales.map((sale) => (
              <div key={sale.id} className="flex justify-between gap-3 text-[13.5px]">
                <span className="text-muted">{formatDate(sale.occurredAt)}</span>
                <span className="font-bold text-ink">
                  {sale.title.replace("Sale · ", "")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-[20px] border-t border-line-light pt-[16px]">
        <div className="text-[10.5px] font-bold tracking-[0.14em] text-softer">
          ASSESSED VALUE &amp; TAX
        </div>
        {taxes.length === 0 ? (
          <p className="mt-[8px] mb-0 text-[13px] text-faint">
            No assessments recorded.
          </p>
        ) : (
          <div className="mt-[8px] space-y-[7px]">
            {taxes.map((tax) => (
              <div key={tax.id} className="flex justify-between gap-3 text-[13px]">
                <span className="shrink-0 text-muted">
                  {tax.occurredAt.slice(0, 4)}
                </span>
                <span className="truncate text-right font-semibold text-ink">
                  {tax.meta.replace("Denver County Assessor · ", "")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function RecentHistory({
  property,
}: {
  property: PropertyDetail;
}) {
  const recent = property.events.slice(0, 5);
  return (
    <section className="rounded-[16px] border border-line bg-white p-[24px_26px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          Recent history
        </h2>
        <Link
          href={`/properties/${property.tokenId}/timeline`}
          className="text-[13px] font-bold text-link no-underline hover:text-brand"
        >
          Full timeline ({property.events.length}) →
        </Link>
      </div>

      <div className="mt-[18px]">
        {recent.map((event, index) => (
          <div key={event.id} className="flex gap-[14px]">
            <div className="flex shrink-0 flex-col items-center">
              <span className="mt-[6px] h-[8px] w-[8px] rounded-full bg-brand" />
              {index < recent.length - 1 ? (
                <span className="w-px flex-1 border-l border-dashed border-line" />
              ) : null}
            </div>
            <div className={index < recent.length - 1 ? "min-w-0 pb-[18px]" : "min-w-0"}>
              <div className="text-[12px] text-muted">
                {formatDate(event.occurredAt)}
              </div>
              <div className="mt-[3px] text-[15px] font-bold text-ink">
                {event.title}
              </div>
              <div className="mt-[2px] text-[13px] text-muted">{event.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export { formatMoney };
