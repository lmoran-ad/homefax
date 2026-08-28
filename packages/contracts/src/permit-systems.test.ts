import { describe, expect, it } from "vitest";
import { calculateHealthScore } from "./health";
import {
  assessFromPermit,
  assessSystemsFromPermits,
  classifyPermit,
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

describe("falling back to who did the work", () => {
  // Denver classifies a great deal of work as REPAIR/REPLACE and stops there,
  // which records that something happened without saying what. The permit
  // still names the licensed contractor, and trade contractors put their trade
  // in their business name.
  it("reads the trade out of a contractor's name when the class says nothing", () => {
    expect(classifyPermit("REPAIR/REPLACE", "ABC ROOFING LLC")).toEqual({
      system: "roof",
      basis: "contractor",
    });
    expect(classifyPermit("Alteration/Tenant Finish", "Mile High Plumbing Co.")).toEqual({
      system: "plumbing",
      basis: "contractor",
    });
    expect(classifyPermit("REPAIR/REPLACE", "Summit Mechanical")).toEqual({
      system: "hvac",
      basis: "contractor",
    });
  });

  it("prefers a stated work type over the contractor's trade", () => {
    // A roofing company pulling a permit that says FURNACE did a furnace.
    expect(classifyPermit("FURNACE REPLACEMENT", "ABC ROOFING LLC")).toEqual({
      system: "hvac",
      basis: "work",
    });
  });

  it("infers nothing from a general contractor or a brand name", () => {
    // "RAM JACK OF COLORADO" is foundation work, and nothing in the string
    // says so. Guessing from brands would mean maintaining a directory of
    // franchises and being confidently wrong about the ones it missed.
    expect(classifyPermit("REPAIR/REPLACE", "RAM JACK OF COLORADO")).toEqual({
      system: "other",
      basis: "none",
    });
    expect(classifyPermit("New Building", "Front Range Builders")).toEqual({
      system: "other",
      basis: "none",
    });
  });

  it("says on the card when the system was inferred rather than stated", () => {
    const assessment = assessFromPermit(
      {
        system: "roof",
        occurredAt: "2023-02-20",
        finaled: true,
        label: "REPAIR/REPLACE",
        basis: "contractor",
        contractor: "ABC ROOFING LLC",
      },
      TODAY,
    );
    expect(assessment.reason).toContain("does not state the work type");
    expect(assessment.reason).toContain("ABC ROOFING LLC");
  });

  it("does not add that caveat when the permit said so itself", () => {
    const assessment = assessFromPermit(
      {
        system: "roof",
        occurredAt: "2023-02-20",
        finaled: true,
        label: "REROOF",
        basis: "work",
        contractor: "ABC ROOFING LLC",
      },
      TODAY,
    );
    expect(assessment.reason).not.toContain("inferred");
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
