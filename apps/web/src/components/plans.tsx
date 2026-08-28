import type { BillingCycle, PlanCard } from "@homefax/contracts";
import type { ReactNode } from "react";

export function PlanGrid({
  plans,
  cycle,
  currentPlan,
  action,
}: {
  plans: PlanCard[];
  cycle: BillingCycle;
  currentPlan?: string;
  action?: (plan: PlanCard) => ReactNode;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[18px]">
      {plans.map((plan) => {
        const isCurrent = currentPlan === plan.id;
        const price = cycle === "annual" ? plan.annual : plan.monthly;
        return (
          <article
            key={plan.id}
            data-testid="plan-card"
            data-plan={plan.id}
            className="flex min-h-[520px] min-w-0 flex-col rounded-[16px] bg-white p-[26px_24px]"
            style={{
              border: plan.primary ? "1.5px solid #e4002b" : "1px solid #e3e7ec",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-[11px] font-bold tracking-[0.14em] text-softer">
                {plan.audience}
              </div>
              {plan.flag ? (
                <span
                  className="shrink-0 rounded-[6px] px-[8px] py-[3px] text-[10px] font-bold tracking-[0.08em]"
                  style={{
                    background: plan.primary ? "#fdecee" : "#e7f4ec",
                    color: plan.primary ? "#a8102a" : "#12693b",
                  }}
                >
                  {plan.flag.toUpperCase()}
                </span>
              ) : null}
            </div>

            <h3 className="mt-[10px] mb-0 text-[22px] font-extrabold tracking-[-0.02em] text-ink">
              {plan.name}
            </h3>

            <div className="mt-[14px] flex items-baseline gap-[8px]">
              <span className="text-[36px] leading-none font-extrabold tracking-[-0.03em] text-ink">
                {price}
              </span>
              {plan.unit ? (
                <span className="text-[13px] font-semibold text-muted">
                  {cycle === "annual" ? "/ yr" : "/ mo"} {plan.unit}
                </span>
              ) : null}
            </div>

            <p className="mt-[14px] mb-0 text-[13.5px] leading-[1.6] text-muted">
              {plan.pitch}
            </p>

            <div className="my-[20px] h-px bg-line-light" />

            <ul className="m-0 list-none space-y-[10px] p-0">
              {plan.features.map((feature) => (
                <li
                  key={feature.label}
                  className="flex gap-[10px] text-[13.5px] leading-[1.45]"
                >
                  <span
                    className="font-bold"
                    style={{ color: feature.included ? "#12693b" : "#9aa5b1" }}
                    aria-hidden="true"
                  >
                    {feature.included ? "✓" : "—"}
                  </span>
                  <span style={{ color: feature.included ? "#3d4a57" : "#9aa5b1" }}>
                    {feature.label}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex-1" />

            <div className="mt-[22px]">
              {action ? (
                action(plan)
              ) : (
                <div
                  className="rounded-[9px] px-4 py-[11px] text-center text-[14px] font-bold"
                  style={{
                    background: plan.primary ? "#e4002b" : "#ffffff",
                    color: plan.primary ? "#ffffff" : "#12222f",
                    border: plan.primary ? "1px solid #e4002b" : "1px solid #d8dee5",
                  }}
                >
                  {isCurrent ? "Current plan" : plan.cta}
                </div>
              )}
            </div>

            <p className="mt-[12px] mb-0 text-[12px] leading-[1.5] text-faint">
              {plan.footnote}
            </p>
          </article>
        );
      })}
    </div>
  );
}

export function VerifiedConditionApiPanel() {
  return (
    <div className="dot-grid rounded-[16px] p-[28px_30px] text-white">
      <div className="text-[11px] font-bold tracking-[0.16em]" style={{ color: "#ffffff8a" }}>
        ENTERPRISE
      </div>
      <h3 className="mt-[10px] mb-0 text-[22px] font-extrabold tracking-[-0.02em]">
        Verified Condition API
      </h3>
      <p className="mt-[10px] mb-0 max-w-[620px] text-[14.5px] leading-[1.6]" style={{ color: "#ffffffcc" }}>
        Per-call access to verified system status, permit closure and Home Health for
        lenders, insurers and appraisers. Scoped by explicit owner consent per record
        class. Restricted and unverified events are never returned.
      </p>
      <div className="mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[18px]">
        {[
          ["PRICE", "$0.35 per call"],
          ["MINIMUM COMMIT", "$25,000 / year"],
          ["CONSENT", "Scoped per record class"],
          ["EXCLUDED", "Restricted and unverified"],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <div className="text-[10.5px] font-bold tracking-[0.14em]" style={{ color: "#ffffff7a" }}>
              {label}
            </div>
            <div className="mt-[5px] text-[15px] font-bold">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The referral surface, shown next to the constraint that keeps it honest. A
 * lead that reorders the timeline or moves Home Health would corrode the
 * neutrality the record is selling, so it does neither.
 */
export function SystemTriggeredLeadsPanel() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[18px]">
      <div className="rounded-[16px] border border-line bg-white p-[26px_28px]">
        <div className="text-[11px] font-bold tracking-[0.14em] text-softer">
          SYSTEM-TRIGGERED LEADS
        </div>
        <h3 className="mt-[10px] mb-0 text-[18.5px] font-extrabold tracking-[-0.015em] text-ink">
          A Watch flag becomes a qualified lead
        </h3>
        <div className="mt-[16px] rounded-[12px] border border-warn-line bg-warn-panel p-[16px_18px]">
          <div className="text-[13px] font-bold text-amber">
            HVAC · Watch · 123 Main Street
          </div>
          <p className="mt-[6px] mb-0 text-[13px] leading-[1.55] text-body">
            Installed Sep 2012, 4 years of an 18-year expected life remaining. The
            April 2026 service note flags elevated compressor amp draw.
          </p>
        </div>
      </div>

      <div className="rounded-[16px] border border-line bg-white p-[26px_28px]">
        <div className="text-[11px] font-bold tracking-[0.14em] text-softer">
          TRUST CONSTRAINT
        </div>
        <h3 className="mt-[10px] mb-0 text-[18.5px] font-extrabold tracking-[-0.015em] text-ink">
          What a referral may never do
        </h3>
        <ul className="mt-[16px] mb-0 list-none space-y-[10px] p-0">
          {[
            "Referrals are labelled as referrals, every time",
            "A paid placement never reorders the timeline",
            "A referral never influences the Home Health score",
          ].map((item) => (
            <li key={item} className="flex gap-[10px] text-[14px] leading-[1.5] text-body">
              <span className="font-bold text-green">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
