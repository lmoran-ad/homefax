import { describe, expect, it } from "vitest";
import {
  calculateHealthScore,
  healthArcDegrees,
  HEALTH_SYSTEM_ORDER,
  STATUS_MULTIPLIERS,
  SYSTEM_WEIGHTS,
  type ScoredSystem,
} from "./health.js";

const all = (status: ScoredSystem["status"]): ScoredSystem[] =>
  HEALTH_SYSTEM_ORDER.map((key) => ({ key, status }));

describe("weights and multipliers", () => {
  it("weights sum to 100 so a perfect record scores exactly 100", () => {
    const sum = Object.values(SYSTEM_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it("matches the documented multipliers", () => {
    expect(STATUS_MULTIPLIERS).toEqual({
      EXCELLENT: 1,
      GOOD: 0.85,
      WATCH: 0.6,
      ATTENTION: 0.3,
      UNKNOWN: 0.5,
    });
  });
});

describe("calculateHealthScore", () => {
  it("scores an all-excellent record at 100 with High confidence", () => {
    const result = calculateHealthScore(all("EXCELLENT"));
    expect(result.score).toBe(100);
    expect(result.confidence).toBe("High");
    expect(result.knownSystems).toBe(7);
  });

  it("scores an all-good record at 85", () => {
    expect(calculateHealthScore(all("GOOD")).score).toBe(85);
  });

  it("scores a record with nothing known at 50 with Low confidence", () => {
    const result = calculateHealthScore(all("UNKNOWN"));
    expect(result.score).toBe(50);
    expect(result.confidence).toBe("Low");
    expect(result.knownSystems).toBe(0);
  });

  it("treats a missing system the same as an UNKNOWN one", () => {
    expect(calculateHealthScore([]).score).toBe(
      calculateHealthScore(all("UNKNOWN")).score,
    );
  });

  it("reproduces the showcase property's 92", () => {
    // Everything excellent except HVAC, which sits at WATCH behind the 2026
    // technician note. 100 - (20 * (1 - 0.6)) = 92.
    const result = calculateHealthScore([
      { key: "roof", status: "EXCELLENT" },
      { key: "hvac", status: "WATCH" },
      { key: "electrical", status: "EXCELLENT" },
      { key: "plumbing", status: "EXCELLENT" },
      { key: "foundation", status: "EXCELLENT" },
      { key: "waterHeater", status: "EXCELLENT" },
      { key: "other", status: "EXCELLENT" },
    ]);
    expect(result.score).toBe(92);
    expect(result.confidence).toBe("High");
  });

  it("satisfies the build plan's mixed-status expectation", () => {
    const score = calculateHealthScore([
      { key: "roof", status: "EXCELLENT" },
      { key: "hvac", status: "GOOD" },
      { key: "electrical", status: "EXCELLENT" },
      { key: "plumbing", status: "GOOD" },
      { key: "waterHeater", status: "EXCELLENT" },
      { key: "foundation", status: "EXCELLENT" },
      { key: "other", status: "GOOD" },
    ]).score;
    expect(score).toBeGreaterThanOrEqual(85);
  });

  it("is deterministic across repeated calls", () => {
    const systems = all("GOOD");
    expect(calculateHealthScore(systems)).toEqual(calculateHealthScore(systems));
  });

  it("is independent of the order systems are supplied in", () => {
    const forward = calculateHealthScore(all("GOOD"));
    const reversed = calculateHealthScore([...all("GOOD")].reverse());
    expect(reversed).toEqual(forward);
  });

  it("steps confidence down as known systems drop", () => {
    const withKnown = (n: number): ScoredSystem[] =>
      HEALTH_SYSTEM_ORDER.map((key, i) => ({
        key,
        status: i < n ? ("GOOD" as const) : ("UNKNOWN" as const),
      }));
    // High is >= 0.85 of systems known, so 6 of 7 (0.857) still clears it.
    expect(calculateHealthScore(withKnown(7)).confidence).toBe("High");
    expect(calculateHealthScore(withKnown(6)).confidence).toBe("High");
    expect(calculateHealthScore(withKnown(5)).confidence).toBe("Medium");
    expect(calculateHealthScore(withKnown(4)).confidence).toBe("Medium");
    expect(calculateHealthScore(withKnown(3)).confidence).toBe("Low");
  });

  it("returns one bar per weighted system, in display order", () => {
    const bars = calculateHealthScore(all("EXCELLENT")).bars;
    expect(bars.map((b) => b.key)).toEqual(HEALTH_SYSTEM_ORDER);
    expect(bars.every((b) => b.pct === 100)).toBe(true);
  });

  it("never returns a score outside 0-100", () => {
    for (const status of ["EXCELLENT", "GOOD", "WATCH", "ATTENTION", "UNKNOWN"] as const) {
      const { score } = calculateHealthScore(all(status));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe("healthArcDegrees", () => {
  it("maps the score onto a full sweep", () => {
    expect(healthArcDegrees(0)).toBe(0);
    expect(healthArcDegrees(92)).toBe(331.2);
    expect(healthArcDegrees(100)).toBe(360);
  });
});
