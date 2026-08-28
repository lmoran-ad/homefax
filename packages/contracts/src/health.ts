import type { SystemKey, SystemStatus } from "./enums";
import type { HealthScore } from "./property";

/**
 * Home Health lives here, beside the enums it is defined over, because three
 * places need the identical answer: the seeder (to cache a score), the API (to
 * serve one) and the tests (to pin it). Duplicating the weights would let them
 * drift, and a score that differs by caller is worse than no score.
 *
 * No model is involved at any point. The score is a pure function of recorded
 * system statuses — that is what makes it defensible to publish next to a
 * disclaimer saying it is not an inspection.
 */
export const SYSTEM_WEIGHTS: Record<SystemKey, number> = {
  roof: 20,
  hvac: 20,
  electrical: 15,
  plumbing: 15,
  foundation: 15,
  waterHeater: 10,
  other: 5,
};

export const STATUS_MULTIPLIERS: Record<SystemStatus, number> = {
  EXCELLENT: 1,
  GOOD: 0.85,
  WATCH: 0.6,
  ATTENTION: 0.3,
  UNKNOWN: 0.5,
};

/** Display order for the per-system bar list, and the scoring order. */
export const HEALTH_SYSTEM_ORDER: SystemKey[] = [
  "roof",
  "hvac",
  "electrical",
  "plumbing",
  "foundation",
  "waterHeater",
  "other",
];

const BAR_LABELS: Record<SystemKey, string> = {
  roof: "Roof",
  hvac: "HVAC",
  electrical: "Electrical",
  plumbing: "Plumbing",
  foundation: "Foundation",
  waterHeater: "Water htr",
  other: "Other",
};

export type ScoredSystem = { key: SystemKey; status: SystemStatus };

/**
 * An UNKNOWN system still scores — at 0.5 — rather than being excluded.
 * Dropping it would let a record with nothing in it score 100, which is the
 * opposite of the truth. Confidence, not the score, is what carries "we don't
 * know much about this house".
 */
export function calculateHealthScore(
  systems: readonly ScoredSystem[],
): HealthScore {
  const byKey = new Map(systems.map((s) => [s.key, s.status]));
  let total = 0;
  let known = 0;
  const bars: HealthScore["bars"] = [];

  for (const key of HEALTH_SYSTEM_ORDER) {
    const status = byKey.get(key) ?? "UNKNOWN";
    if (byKey.has(key) && status !== "UNKNOWN") known += 1;
    const weight = SYSTEM_WEIGHTS[key];
    const points = weight * STATUS_MULTIPLIERS[status];
    total += points;
    bars.push({
      key,
      label: `${BAR_LABELS[key]} · ${weight}`,
      weight,
      points: Number(points.toFixed(1)),
      pct: Math.round((points / weight) * 100),
      status,
    });
  }

  const totalSystems = HEALTH_SYSTEM_ORDER.length;
  const ratio = known / totalSystems;

  return {
    score: Math.round(total),
    confidence: ratio >= 0.85 ? "High" : ratio >= 0.5 ? "Medium" : "Low",
    knownSystems: known,
    totalSystems,
    bars,
  };
}

/** Donut sweep for the Home Health dial. */
export function healthArcDegrees(score: number): number {
  return score * 3.6;
}
