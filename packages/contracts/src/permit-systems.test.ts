import { describe, expect, it } from "vitest";
import { calculateHealthScore } from "./health";
import {
  assessFromPermit,
  assessSystemsFromPermits,
  classifyPermitSystem,
} from "./permit-systems";

const TODAY = "2026-08-28";

describe("placing a permit against a system", () => {
  it("reads the work classes a jurisdiction actually writes", () => {
    expect(classifyPermitSystem("REROOF - ASPHALT SHINGLE")).toBe("roof");
    expect(classifyPermitSystem("Furnace replacement")).toBe("hvac");
    expect(classifyPermitSystem("ELECTRICAL SERVICE UPGRADE")).toBe("electrical");
    expect(classifyPermitSystem("Sewer line repair")).toBe("plumbing");
    expect(classifyPermitSystem("FOUNDATION UNDERPINNING")).toBe("foundation");
  });

  it("tests the specific term before the general one it contains", () => {
    // "WATER HEATER" contains "WATER"; "GAS FURNACE" would reach plumbing via
    // "GAS LINE" if the order were wrong. Both belong to the specific system.
    expect(classifyPermitSystem("WATER HEATER REPLACEMENT")).toBe("waterHeater");
    expect(classifyPermitSystem("TANKLESS HOT WATER")).toBe("waterHeater");
    expect(classifyPermitSystem("GAS FURNACE INSTALL")).toBe("hvac");
  });

  it("puts a new building against other rather than refreshing the whole house", () => {
    // The permit that prompted this rule was a detached garage. Reading it as
    // "the house is new" would lift every system on evidence for none of them.
    expect(classifyPermitSystem("NEW BUILDING")).toBe("other");
    expect(classifyPermitSystem("Kitchen remodel")).toBe("other");
    expect(classifyPermitSystem("Deck")).toBe("other");
  });
});

describe("grading work by how far through its life it is", () => {
  it("grades on the fraction of expected life used, not on age alone", () => {
    // Both are fifteen years old. A roof is 60% through 25 years; a water
    // heater is long past 12, and calling them the same would be nonsense.
    const roof = assessFromPermit(
      { system: "roof", occurredAt: "2011-08-28", finaled: true, label: "REROOF" },
      TODAY,
    );
    const heater = assessFromPermit(
      { system: "waterHeater", occurredAt: "2011-08-28", finaled: true, label: "WATER HEATER" },
      TODAY,
    );

    expect(roof.status).toBe("GOOD");
    expect(heater.status).toBe("ATTENTION");
    expect(roof.remainingYears).toBe(10);
    expect(heater.remainingYears).toBe(0);
  });

  it("caps unfinaled work at WATCH however recent it is", () => {
    // The jurisdiction recorded that work was allowed to start, not that it
    // was done. Scoring a house on intentions is how a record stops meaning
    // anything.
    const finaled = assessFromPermit(
      { system: "roof", occurredAt: "2025-06-01", finaled: true, label: "REROOF" },
      TODAY,
    );
    const issued = assessFromPermit(
      { system: "roof", occurredAt: "2025-06-01", finaled: false, label: "REROOF" },
      TODAY,
    );

    expect(finaled.status).toBe("EXCELLENT");
    expect(issued.status).toBe("WATCH");
    expect(issued.reason).toContain("no completion recorded");
  });

  it("explains itself in checkable arithmetic", () => {
    const assessment = assessFromPermit(
      { system: "hvac", occurredAt: "2020-08-28", finaled: true, label: "FURNACE" },
      TODAY,
    );
    expect(assessment.reason).toBe(
      "Permit finaled 6 years ago. Expected service life 20 years.",
    );
    expect(assessment.expectedLifeYears).toBe(20);
  });
});

describe("assessing a permit history", () => {
  it("takes the most recent permit per system, not the best one", () => {
    // A roof replaced in 2004 and again in 2021 is a 2021 roof. Letting the
    // older permit win would describe a house that no longer exists — and
    // letting the *better-scoring* one win would be worse still.
    const assessments = assessSystemsFromPermits(
      [
        { system: "roof", occurredAt: "2021-05-02", finaled: false, label: "REROOF" },
        { system: "roof", occurredAt: "2004-04-03", finaled: true, label: "REROOF" },
      ],
      TODAY,
    );

    const roof = assessments.get("roof")!;
    expect(roof.installedAt).toBe("2021-05-02");
    // The newer permit is unfinaled, so it caps at WATCH even though the older
    // finaled one would have scored ATTENTION. Recency wins either way.
    expect(roof.status).toBe("WATCH");
  });

  it("lifts a record off the all-unknown floor", () => {
    // This is the whole point: a provisioned record with no system data scores
    // exactly 50, which is honest and says nothing.
    const floor = calculateHealthScore([]);
    expect(floor.score).toBe(50);

    const assessments = assessSystemsFromPermits(
      [
        { system: "roof", occurredAt: "2022-06-01", finaled: true, label: "REROOF" },
        { system: "hvac", occurredAt: "2019-03-14", finaled: true, label: "FURNACE" },
        { system: "electrical", occurredAt: "2018-01-09", finaled: true, label: "PANEL" },
      ],
      TODAY,
    );
    const scored = calculateHealthScore(
      [...assessments].map(([key, a]) => ({ key, status: a.status })),
    );

    expect(scored.score).toBeGreaterThan(floor.score);
    // Systems with no permit stay UNKNOWN rather than being assumed good, so
    // the score rises without pretending the house is fully documented.
    expect(scored.confidence).not.toBe("High");
  });

  it("leaves a system with no permit alone", () => {
    const assessments = assessSystemsFromPermits(
      [{ system: "roof", occurredAt: "2022-06-01", finaled: true, label: "REROOF" }],
      TODAY,
    );
    expect(assessments.has("roof")).toBe(true);
    expect(assessments.has("plumbing")).toBe(false);
  });
});
