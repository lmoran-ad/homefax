import { describe, expect, it } from "vitest";
import {
  ExtractedPropertyEventSchema,
  HomeAnswerSchema,
} from "@hometoken/contracts";
import { extractJson, isConfigured } from "./client.js";
import { manualProposal } from "./extract-document.js";

describe("extractJson", () => {
  it("parses a bare object", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("ignores prose before and after the object", () => {
    expect(extractJson('Here you go:\n{"a":1}\nHope that helps.')).toEqual({ a: 1 });
  });

  it("survives a fenced code block", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("handles nested objects without truncating", () => {
    expect(extractJson('prefix {"a":{"b":[1,2]},"c":3} suffix')).toEqual({
      a: { b: [1, 2] },
      c: 3,
    });
  });

  it("does not stop at a brace inside a string literal", () => {
    // A greedy or naive scan would cut the object short here.
    expect(extractJson('{"note":"a } brace","ok":true}')).toEqual({
      note: "a } brace",
      ok: true,
    });
  });

  it("handles escaped quotes inside strings", () => {
    expect(extractJson('{"note":"say \\"hi\\" }","ok":true}')).toEqual({
      note: 'say "hi" }',
      ok: true,
    });
  });

  it("throws when there is no object", () => {
    expect(() => extractJson("no json here")).toThrow(/No JSON object/);
  });

  it("throws on an unbalanced object rather than returning a partial", () => {
    expect(() => extractJson('{"a":1')).toThrow(/Unbalanced/);
  });
});

describe("isConfigured", () => {
  it("is false without a key, so callers fall back rather than throwing", () => {
    expect(isConfigured({ apiKey: undefined, model: "m" })).toBe(false);
    expect(isConfigured({ apiKey: "", model: "m" })).toBe(false);
    expect(isConfigured({ apiKey: "   ", model: "m" })).toBe(false);
  });

  it("is true with a key", () => {
    expect(isConfigured({ apiKey: "sk-ant-x", model: "m" })).toBe(true);
  });
});

describe("HomeAnswerSchema", () => {
  it("accepts a well-formed answer", () => {
    const parsed = HomeAnswerSchema.parse({
      answer: "The roof was replaced on May 14, 2023.",
      confidence: "HIGH",
      eventIds: ["EV-0016"],
      caveat: null,
    });
    expect(parsed.eventIds).toEqual(["EV-0016"]);
  });

  it("defaults missing optional fields", () => {
    const parsed = HomeAnswerSchema.parse({ answer: "x", confidence: "LOW" });
    expect(parsed.eventIds).toEqual([]);
    expect(parsed.caveat).toBeNull();
  });

  it("rejects a malformed confidence", () => {
    expect(() =>
      HomeAnswerSchema.parse({ answer: "x", confidence: "VERY HIGH" }),
    ).toThrow();
  });

  it("rejects an empty answer", () => {
    expect(() => HomeAnswerSchema.parse({ answer: "", confidence: "LOW" })).toThrow();
  });
});

describe("ExtractedPropertyEventSchema", () => {
  const valid = {
    suggestedEventType: "SYSTEM_INSTALLATION",
    title: "HVAC replacement",
    description: "Carrier 16 SEER2 3-ton condenser",
    occurredAt: "2026-08-24",
    contractor: "Summit Mechanical",
    amount: 9860,
    currency: "USD",
    category: "HVAC",
    materials: [],
    warrantyYears: 10,
    permitNumber: "M26-70214",
    systemType: "HVAC",
    confidence: "HIGH",
    evidence: ["Total: $9,860.00"],
  };

  it("accepts a complete extraction", () => {
    expect(ExtractedPropertyEventSchema.parse(valid).amount).toBe(9860);
  });

  it("accepts nulls for everything the document did not state", () => {
    const parsed = ExtractedPropertyEventSchema.parse({
      ...valid,
      occurredAt: null,
      contractor: null,
      amount: null,
      warrantyYears: null,
      permitNumber: null,
      systemType: null,
      category: null,
    });
    expect(parsed.amount).toBeNull();
  });

  it("defaults missing lists to empty", () => {
    const { materials, evidence, ...rest } = valid;
    const parsed = ExtractedPropertyEventSchema.parse(rest);
    expect(parsed.materials).toEqual([]);
    expect(parsed.evidence).toEqual([]);
  });

  it("rejects an event type outside the extractable set", () => {
    expect(() =>
      ExtractedPropertyEventSchema.parse({ ...valid, suggestedEventType: "SALE" }),
    ).toThrow();
  });

  it("rejects a malformed date", () => {
    expect(() =>
      ExtractedPropertyEventSchema.parse({ ...valid, occurredAt: "Aug 24 2026" }),
    ).toThrow();
  });
});

describe("manualProposal", () => {
  it("proposes nothing it cannot read from the document", () => {
    const proposal = manualProposal("summit-mechanical-26-3390.txt");
    expect(proposal.confidence).toBe("LOW");
    expect(proposal.amount).toBeNull();
    expect(proposal.occurredAt).toBeNull();
    expect(proposal.contractor).toBeNull();
    expect(proposal.evidence).toEqual([]);
  });

  it("derives a readable title from the file name", () => {
    expect(manualProposal("summit-mechanical-26-3390.txt").title).toBe(
      "summit mechanical 26 3390",
    );
  });

  it("still validates against the contract", () => {
    expect(() =>
      ExtractedPropertyEventSchema.parse(manualProposal("invoice.txt")),
    ).not.toThrow();
  });
});
