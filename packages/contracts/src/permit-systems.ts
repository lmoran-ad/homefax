import type { SystemKey, SystemStatus } from "./enums";

/**
 * Turning permits into system statuses.
 *
 * A permit is the strongest evidence public data offers about a house: a
 * jurisdiction recording that specific work was done on a specific date, and
 * in most cases that it passed inspection. A record provisioned from county
 * data otherwise lands with every system UNKNOWN and a Home Health of exactly
 * 50 — which is honest, and also says nothing, when the permit history sitting
 * next to it on the timeline plainly says more.
 *
 * Like the score itself this is a pure function with no model in it. A roof
 * replaced in 2004 against a 25-year expected life is 21 years into it, and
 * that is arithmetic anyone can check — which is what makes it publishable
 * beside a disclaimer that this is not an inspection.
 */

/**
 * Expected service life in years. Deliberately conservative — the point is to
 * distinguish "recently done" from "long overdue", not to predict a failure,
 * and overstating a life would flatter a record.
 */
export const SYSTEM_SERVICE_LIFE: Record<SystemKey, number> = {
  roof: 25,
  hvac: 20,
  electrical: 40,
  plumbing: 50,
  foundation: 75,
  waterHeater: 12,
  other: 20,
};

/**
 * Keywords that place a permit against a system.
 *
 * Every jurisdiction writes its work classes differently, so this matches on
 * substrings rather than an exact vocabulary, and the first system to match
 * wins — which is why the specific entries come before the general ones.
 * "WATER HEATER" has to be tested before "WATER" would reach plumbing, and
 * "GAS FURNACE" before "GAS" would.
 */
const SYSTEM_KEYWORDS: [SystemKey, readonly string[]][] = [
  ["waterHeater", ["WATER HEATER", "WATERHEATER", "HOT WATER", "TANKLESS"]],
  [
    "hvac",
    [
      "HVAC",
      "FURNACE",
      "BOILER",
      "AIR CONDITION",
      "AIR-CONDITION",
      "HEAT PUMP",
      "MECHANICAL",
      "HEATING",
      "COOLING",
      "EVAPORATIVE",
      "SWAMP COOLER",
      "MINI SPLIT",
    ],
  ],
  ["roof", ["ROOF", "REROOF", "RE-ROOF", "SHINGLE", "GUTTER"]],
  [
    "electrical",
    [
      "ELECTRIC",
      "PANEL",
      "SERVICE UPGRADE",
      "SOLAR",
      "PHOTOVOLTAIC",
      "PV SYSTEM",
      "EV CHARGER",
      "WIRING",
    ],
  ],
  [
    "plumbing",
    ["PLUMB", "SEWER", "DRAIN", "REPIPE", "RE-PIPE", "GAS LINE", "GASLINE", "WATER LINE", "BACKFLOW"],
  ],
  [
    "foundation",
    ["FOUNDATION", "UNDERPIN", "STRUCTURAL", "WATERPROOF", "PIER", "RETAINING WALL", "SHORING"],
  ],
];

/**
 * The system a permit speaks to, or `other`.
 *
 * `other` is the honest home for the majority of permits — a new detached
 * garage, a deck, a kitchen remodel. It carries real weight in the score (5)
 * without pretending a garage says anything about the roof. Notably a "NEW
 * BUILDING" permit lands here rather than refreshing every system: the sample
 * that prompted this rule was a garage builder, and reading it as "the house
 * is new" would inflate a score on evidence that does not support it.
 */
export function classifyPermitSystem(work: string): SystemKey {
  const text = work.toUpperCase();
  for (const [system, keywords] of SYSTEM_KEYWORDS) {
    if (keywords.some((keyword) => text.includes(keyword))) return system;
  }
  return "other";
}

export type PermitEvidence = {
  system: SystemKey;
  /** YYYY-MM-DD. */
  occurredAt: string;
  /** Whether the jurisdiction recorded the work as passing inspection. */
  finaled: boolean;
  label: string;
};

export type SystemAssessment = {
  status: SystemStatus;
  installedAt: string;
  expectedLifeYears: number;
  remainingYears: number;
  /** Why the card says what it says, in the words the card will use. */
  reason: string;
  label: string;
};

function yearsBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return (end - start) / (365.2425 * 24 * 60 * 60 * 1000);
}

/**
 * Grades one piece of work by how far through its expected life it is.
 *
 * A permit that was issued and never finaled caps at WATCH however recent it
 * is: the jurisdiction recorded that work was allowed to start, not that it
 * was completed, and treating those as equivalent would score a house on
 * intentions.
 */
export function assessFromPermit(
  evidence: PermitEvidence,
  asOf: string,
): SystemAssessment {
  const life = SYSTEM_SERVICE_LIFE[evidence.system];
  const age = Math.max(0, yearsBetween(evidence.occurredAt, asOf));
  const used = life > 0 ? age / life : 1;

  let status: SystemStatus;
  if (used >= 1) status = "ATTENTION";
  else if (used >= 0.75) status = "WATCH";
  else if (used >= 0.4) status = "GOOD";
  else status = "EXCELLENT";

  if (!evidence.finaled && (status === "EXCELLENT" || status === "GOOD")) {
    status = "WATCH";
  }

  const years = Math.round(age);
  const remainingYears = Math.max(0, Math.round(life - age));
  const ageLabel =
    years === 0 ? "this year" : years === 1 ? "1 year ago" : `${years} years ago`;

  return {
    status,
    installedAt: evidence.occurredAt,
    expectedLifeYears: life,
    remainingYears,
    label: evidence.label,
    reason: evidence.finaled
      ? `Permit finaled ${ageLabel}. Expected service life ${life} years.`
      : `Permit issued ${ageLabel}, with no completion recorded against it.`,
  };
}

/**
 * The best evidence per system across a permit history.
 *
 * Most recent wins rather than best: a roof replaced in 2004 and again in 2021
 * is a 2021 roof, and letting an older permit outrank a newer one would
 * describe a house that no longer exists.
 */
export function assessSystemsFromPermits(
  permits: readonly PermitEvidence[],
  asOf: string,
): Map<SystemKey, SystemAssessment> {
  const newest = new Map<SystemKey, PermitEvidence>();
  for (const permit of permits) {
    const held = newest.get(permit.system);
    if (!held || permit.occurredAt > held.occurredAt) {
      newest.set(permit.system, permit);
    }
  }

  const assessments = new Map<SystemKey, SystemAssessment>();
  for (const [system, evidence] of newest) {
    assessments.set(system, assessFromPermit(evidence, asOf));
  }
  return assessments;
}
