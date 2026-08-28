"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  BillingCycle,
  Plan,
  PlanCard,
  UnitEconomicsRow,
} from "@hometoken/contracts";
import { Button } from "./buttons";
import { useToast } from "./feedback";
import {
  PlanGrid,
  SystemTriggeredLeadsPanel,
  VerifiedConditionApiPanel,
} from "./plans";
import { ClientApiError, request } from "@/lib/client";

export function PlansScreen({
  plans,
  unitEconomics,
  unitEconomicsTotal,
  currentPlan,
  cycle: initialCycle,
}: {
  plans: PlanCard[];
  unitEconomics: UnitEconomicsRow[];
  unitEconomicsTotal: string;
  currentPlan: Plan;
  cycle: BillingCycle;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle);
  const [busy, setBusy] = useState<string | null>(null);

  async function choose(plan: PlanCard) {
    if (plan.id === currentPlan) return;
    setBusy(plan.id);
    try {
      await request("/billing/upgrade", {
        method: "POST",
        body: { plan: plan.id, cycle },
      });
      toast(`Switched to ${plan.name}.`);
      router.refresh();
    } catch (error) {
      toast(
        error instanceof ClientApiError
          ? error.error.message
          : "That plan change could not be applied.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Link
        href="/settings"
        className="text-[13.5px] font-bold text-link no-underline hover:text-brand"
      >
        ← Account settings
      </Link>

      <div className="mt-[20px] mb-[26px] flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.03em] text-ink">
            Plans &amp; billing
          </h1>
          <p className="mt-[10px] mb-0 max-w-[620px] text-[15px] leading-[1.6] text-muted">
            Priced for the side of the market that benefits from a verified record.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="flex rounded-[999px] border border-line bg-white p-[3px]">
            {(["monthly", "annual"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCycle(option)}
                className={`cursor-pointer rounded-[999px] px-[16px] py-[7px] text-[13px] font-bold capitalize ${
                  cycle === option
                    ? "bg-navy text-white"
                    : "bg-transparent text-body hover:text-navy"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          {cycle === "annual" ? (
            <span className="text-[12.5px] font-bold text-green">
              Two months free
            </span>
          ) : null}
        </div>
      </div>

      <PlanGrid
        plans={plans}
        cycle={cycle}
        currentPlan={currentPlan}
        action={(plan) => (
          <Button
            full
            variant={plan.primary ? "primary" : "outline"}
            disabled={plan.id === currentPlan || busy !== null}
            onClick={() => void choose(plan)}
          >
            {plan.id === currentPlan
              ? "Current plan"
              : busy === plan.id
                ? "Working…"
                : plan.cta}
          </Button>
        )}
      />

      <div className="mt-[22px]">
        <VerifiedConditionApiPanel />
      </div>

      <div className="mt-[22px]">
        <SystemTriggeredLeadsPanel />
      </div>

      <section className="mt-[22px] rounded-[16px] border border-line bg-white p-[26px_28px]">
        <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          Illustrative unit economics
        </h2>
        <p className="mt-[8px] mb-[18px] text-[13.5px] leading-[1.6] text-muted">
          Placeholder figures for a discussion about shape. Not a forecast — every
          line names what it actually depends on.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                {["Revenue line", "Price", "Units", "Annual", "What it depends on"].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="px-[10px] py-[10px] text-[10.5px] font-bold tracking-[0.12em] text-softer"
                    >
                      {heading.toUpperCase()}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {unitEconomics.map((row) => (
                <tr key={row.line} className="border-b border-line-light">
                  <td className="px-[10px] py-[12px] text-[13.5px] font-bold text-ink">
                    {row.line}
                  </td>
                  <td className="px-[10px] py-[12px] text-[13px] text-body">
                    {row.price}
                  </td>
                  <td className="px-[10px] py-[12px] text-[13px] text-body">
                    {row.units}
                  </td>
                  <td className="px-[10px] py-[12px] text-[13.5px] font-bold text-ink">
                    {row.annual}
                  </td>
                  <td className="px-[10px] py-[12px] text-[12.5px] leading-[1.5] text-muted">
                    {row.dependsOn}
                  </td>
                </tr>
              ))}
              <tr>
                <td
                  className="px-[10px] py-[14px] text-[13.5px] font-extrabold text-ink"
                  colSpan={3}
                >
                  Blended
                </td>
                <td className="px-[10px] py-[14px] text-[16px] font-extrabold text-ink">
                  {unitEconomicsTotal}
                </td>
                <td className="px-[10px] py-[14px] text-[12.5px] text-faint">
                  Illustrative, for discussion
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
