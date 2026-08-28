import type {
  BillingCycle,
  PaywallGate,
  Plan,
  PlanCard,
  Paywall,
  Subscription,
  UnitEconomicsRow,
} from "@homefax/contracts";
import { profiles, type ProfileRow } from "@homefax/db";
import { eq } from "drizzle-orm";
import type { AppContext } from "../lib/context";
import { PLAN_NAMES, PLAN_PRICES } from "./auth-service";
import { addDays, formatDate, today } from "../lib/format";

/** Free-tier Ask This Home allowance. Paid plans are uncapped. */
export const FREE_ASK_QUOTA = 3;

export function askQuota(plan: Plan): number | null {
  return plan === "free" ? FREE_ASK_QUOTA : null;
}

export function askUsed(profile: ProfileRow): number {
  return Number(profile.askQuestionsUsed) || 0;
}

export async function consumeAskQuestion(
  ctx: AppContext,
  profile: ProfileRow,
): Promise<number> {
  const next = askUsed(profile) + 1;
  await ctx.db
    .update(profiles)
    .set({ askQuestionsUsed: String(next) })
    .where(eq(profiles.id, profile.id));
  return next;
}

export async function setPlan(
  ctx: AppContext,
  profile: ProfileRow,
  plan: Plan,
  cycle: BillingCycle,
): Promise<ProfileRow> {
  const [row] = await ctx.db
    .update(profiles)
    .set({
      plan,
      billingCycle: cycle,
      subscriptionCancelled: false,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, profile.id))
    .returning();
  return row ?? profile;
}

export async function cancelSubscription(
  ctx: AppContext,
  profile: ProfileRow,
): Promise<ProfileRow> {
  // Cancelling ends paid features at the end of the period. It does not touch
  // the record: the events and documents belong to the property, not to the
  // subscription that happened to be paying when they were added.
  const [row] = await ctx.db
    .update(profiles)
    .set({ subscriptionCancelled: true, updatedAt: new Date() })
    .where(eq(profiles.id, profile.id))
    .returning();
  return row ?? profile;
}

export function subscriptionFor(profile: ProfileRow): Subscription {
  const plan = profile.plan as Plan;
  const cycle = profile.billingCycle as BillingCycle;
  const periodEnd = addDays(today(), cycle === "annual" ? 365 : 30);

  const status: Subscription["status"] =
    plan === "free" ? "FREE" : profile.subscriptionCancelled ? "CANCELS SOON" : "ACTIVE";

  return {
    plan,
    planName: PLAN_NAMES[plan],
    price: PLAN_PRICES[plan],
    cycle,
    status,
    renewsOn: status === "ACTIVE" ? formatDate(periodEnd) : null,
    accessEndsOn: status === "CANCELS SOON" ? formatDate(periodEnd) : null,
    paymentMethod: plan === "free" ? null : "Visa ending 4242",
  };
}

export const PLAN_CARDS: PlanCard[] = [
  {
    id: "free",
    audience: "Homeowner",
    name: "Homeowner",
    monthly: "Free",
    annual: "Free",
    unit: "",
    pitch:
      "Your home's record, its timeline and its Home Health score, for as long as you own the property.",
    features: [
      { label: "Full property record and timeline", included: true },
      { label: "Home Health score and system status", included: true },
      { label: "Approve or decline contractor submissions", included: true },
      { label: "Document storage beyond 10 files", included: false },
      { label: "Report export and warranty alerts", included: false },
    ],
    cta: "Current plan",
    footnote: "The record stays with the property whether or not you pay.",
    flag: null,
    primary: false,
  },
  {
    id: "homeowner_plus",
    audience: "Homeowner",
    name: "Homeowner Plus",
    monthly: "$8",
    annual: "$80",
    unit: "per property",
    pitch:
      "For owners who are maintaining a home deliberately and want the paperwork to keep up.",
    features: [
      { label: "Everything in Homeowner", included: true },
      { label: "Unlimited document storage", included: true },
      { label: "Warranty expiry and service-interval alerts", included: true },
      { label: "Report export when you list", included: true },
      { label: "Priority contractor matching", included: false },
    ],
    cta: "Upgrade this property",
    footnote: "Billed per property. Cancel any time; the record is unaffected.",
    flag: null,
    primary: false,
  },
  {
    id: "agent_pro",
    audience: "Agent · Brokerage",
    name: "Agent Pro",
    monthly: "$39",
    annual: "$390",
    unit: "per seat",
    pitch:
      "A verified maintenance record shortens negotiation and reduces post-inspection concessions.",
    features: [
      { label: "Unlimited HomeFax claims and records", included: true },
      { label: "Unlimited grounded questions per property", included: true },
      { label: "Branded, buyer-ready report export", included: true },
      { label: "Hash-chain attestation page on every export", included: true },
      { label: "Brokerage-wide analytics", included: false },
    ],
    cta: "Upgrade to Agent Pro",
    footnote: "Per seat. Brokerage licensing available.",
    flag: "Primary revenue",
    primary: true,
  },
  {
    id: "verified_source",
    audience: "Contractor",
    name: "Verified Source",
    monthly: "$25",
    annual: "$250",
    unit: "per license",
    pitch:
      "Your invoices flow into the records for work you performed, and stay attached for the next owner to see.",
    features: [
      { label: "Professional Verified status on submissions", included: true },
      { label: "Attribution that survives resale", included: true },
      { label: "Listed in Find a Pro", included: true },
      { label: "Eligible for system-triggered leads", included: true },
      { label: "Multi-license accounts", included: false },
    ],
    cta: "Start verification",
    footnote: "One license per subscription. Verification takes 2–3 business days.",
    flag: "Compounding",
    primary: false,
  },
];

export const PAYWALLS: Record<PaywallGate, Paywall> = {
  export: {
    key: "export",
    tierLabel: "AGENT PRO",
    planLine: "$39 per seat / month",
    title: "Printable HomeFax report",
    body: "Branded, buyer-ready PDF of the full property record, including verification levels, permit closures and the hash-chain attestation page. Agents on the free tier can view records but not export them.",
    bullets: [
      "Unlimited exports across every HomeFax you touch",
      "Your brokerage branding on every page",
      "Attestation page showing the ledger was intact at export time",
    ],
    cta: "Upgrade to Agent Pro",
  },
  ask: {
    key: "ask",
    tierLabel: "AGENT PRO",
    planLine: "$39 per seat / month",
    title: "You have used your 3 free questions",
    body: "Ask This Home is metered on the free tier. Agent Pro removes the cap across every property in your book, and keeps each answer grounded in that property's record.",
    bullets: [
      "Unlimited grounded questions per property",
      "Cited answers you can paste into a buyer summary",
      "Question history retained per HomeFax",
    ],
    cta: "Upgrade to Agent Pro",
  },
  contractor: {
    key: "contractor",
    tierLabel: "VERIFIED SOURCE",
    planLine: "$25 / month per license",
    title: "Become a verified source",
    body: "Verified contractors submit invoices directly into the records for work they performed. Those events carry Professional Verified status, and the contractor stays attached to the work for the next owner to see.",
    bullets: [
      "Professional Verified status on every submitted event",
      "Attribution that follows the property through resale",
      "Eligible for system-triggered replacement leads",
    ],
    cta: "Start verification",
  },
  api: {
    key: "api",
    tierLabel: "ENTERPRISE",
    planLine: "Volume pricing",
    title: "Verified Condition API",
    body: "Per-call access to verified system status, permit closure and Home Health, scoped by explicit owner consent. Restricted and unverified events are never returned.",
    bullets: [
      "Consent scoping per record class",
      "Deterministic Home Health inputs, no model output in the score",
      "Sandbox dataset before contract",
    ],
    cta: "Request access",
  },
  homeowner: {
    key: "homeowner",
    tierLabel: "HOMEOWNER PLUS",
    planLine: "$8 / month per property",
    title: "Homeowner Plus",
    body: "Free homeowners get the record and the timeline. Plus adds unlimited document storage, report export, and alerts as warranties and service intervals come due.",
    bullets: [
      "Unlimited document storage",
      "Warranty expiry and service-interval alerts",
      "Report export when you list",
    ],
    cta: "Upgrade this property",
  },
};

/**
 * Illustrative only. These are placeholder figures for a discussion about
 * shape, not a forecast — every line is labelled with what it actually
 * depends on so nobody mistakes the blend for a projection.
 */
export const UNIT_ECONOMICS: UnitEconomicsRow[] = [
  {
    line: "Agent Pro seats",
    price: "$39 / mo",
    units: "4,200 seats",
    annual: "$1.97M",
    dependsOn: "Brokerage adoption and seat penetration per office",
  },
  {
    line: "Verified Source licenses",
    price: "$25 / mo",
    units: "3,100 licenses",
    annual: "$0.93M",
    dependsOn: "Contractor density per market and renewal rate",
  },
  {
    line: "Homeowner Plus",
    price: "$8 / mo",
    units: "6,400 properties",
    annual: "$0.61M",
    dependsOn: "Conversion at transfer, when the record changes hands",
  },
  {
    line: "Verified Condition API",
    price: "$0.35 / call",
    units: "1.2M calls",
    annual: "$0.42M",
    dependsOn: "Lender and insurer contracts clearing consent review",
  },
  {
    line: "Listing-level compile fee",
    price: "$25 / listing",
    units: "4,000 listings",
    annual: "$0.10M",
    dependsOn: "Attach rate to existing pre-listing workflows",
  },
];

export const UNIT_ECONOMICS_TOTAL = "$4.03M";
