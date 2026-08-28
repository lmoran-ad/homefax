import type { FixtureDemoDocument } from "./types";

/**
 * Documents offered in Add Record. Real text, so extraction has something
 * genuine to read — the demo must not depend on a model inventing fields the
 * document does not contain.
 */
export const addRecordDemoDocuments: FixtureDemoDocument[] = [
  {
    key: "hvac",
    title: "HVAC replacement invoice",
    hint: "Summit Mechanical · Aug 2026 · $9,860",
    name: "summit-mechanical-26-3390.txt",
    trade: null,
    text: `SUMMIT MECHANICAL
1420 W Evans Ave, Denver CO
License CO-MC-31188

Invoice 26-3390
Date of service: August 24, 2026

Property: 123 Main Street, Denver, CO 80206

Work performed:
- Remove and dispose 2012 3-ton condenser and furnace
- Install Carrier 16 SEER2 3-ton condenser
- Install 96% efficiency variable speed furnace
- New line set, pad, disconnect and smart thermostat
- Permit M26-70214, City & County of Denver

Equipment warranty: 10 years parts, registered
Labor warranty: 2 years

Total: $9,860.00
Paid in full 08/24/2026`,
  },
  {
    key: "gutters",
    title: "Gutter and downspout invoice",
    hint: "Front Range Exteriors · Jul 2026 · $2,140",
    name: "front-range-exteriors-8841.txt",
    trade: null,
    text: `FRONT RANGE EXTERIORS
Invoice 8841
Date: July 9, 2026

123 Main Street, Denver, CO 80206

Remove existing gutters, 180 linear feet
Install 6 inch seamless aluminum gutters
Six downspouts with 8 ft extensions away from foundation
Gutter guards, full perimeter

Material warranty: 20 years finish
Workmanship: 5 years

Total: $2,140.00`,
  },
  {
    key: "sewer",
    title: "Sewer scope report",
    hint: "Denver Sewer Scope · Aug 2026 · $185",
    name: "sewer-scope-2026-0812.txt",
    trade: null,
    text: `DENVER SEWER SCOPE
Report 2026-0812
Inspection date: August 12, 2026

123 Main Street, Denver, CO 80206

Line material: cast iron transitioning to PVC at 34 ft
Length scoped: 62 ft to main
Findings: minor scale at 18 ft, no root intrusion, no bellies observed
Result: Serviceable condition, no repair recommended

Fee: $185.00`,
  },
];

/** Documents offered in the contractor's Jobs submission form, by trade. */
export const contractorDemoDocuments: FixtureDemoDocument[] = [
  {
    key: "hvac-install",
    title: "HVAC replacement invoice",
    hint: "Aug 2026 · $9,860",
    name: "summit-mechanical-26-3390.txt",
    trade: "HVAC",
    text: `SUMMIT MECHANICAL
1420 W Evans Ave, Denver CO
License CO-MC-31188

Invoice 26-3390
Date of service: August 26, 2026

Property: 123 Main Street, Denver, CO 80206

Work performed:
- Remove and dispose 2012 3-ton condenser and furnace
- Install Carrier 16 SEER2 3-ton condenser
- Install 96% efficiency variable speed furnace
- New line set, pad, disconnect and smart thermostat
- Permit M26-70214, City & County of Denver

Equipment warranty: 10 years parts, registered to the property
Labor warranty: 2 years

Total: $9,860.00
Paid in full 08/26/2026`,
  },
  {
    key: "hvac-service",
    title: "Diagnostic and service invoice",
    hint: "Aug 2026 · $340",
    name: "summit-mechanical-26-3341.txt",
    trade: "HVAC",
    text: `SUMMIT MECHANICAL
License CO-MC-31188
Invoice 26-3341
Date of service: August 25, 2026

123 Main Street, Denver, CO 80206

Diagnostic on 2012 3-ton condenser.
Amp draw at 1.4x rated. Compressor windings degraded.
Recommendation: replace system; repair not advised at 13 years.

Diagnostic and refrigerant: $340.00`,
  },
  {
    key: "generic",
    title: "Completed work invoice",
    hint: "Aug 2026",
    name: "invoice-26-0891.txt",
    trade: null,
    text: `INVOICE 26-0891
Date of service: August 26, 2026

123 Main Street, Denver, CO 80206

Work performed as scoped and approved by owner.
Materials and labor included.

Total: $4,200.00
Workmanship warranty: 2 years`,
  },
];

export function contractorDocumentsForTrade(
  trade: string,
): FixtureDemoDocument[] {
  const t = trade.toLowerCase();
  const matched = contractorDemoDocuments.filter(
    (d) => d.trade && t.includes(d.trade.toLowerCase()),
  );
  return matched.length
    ? matched
    : contractorDemoDocuments.filter((d) => d.trade === null);
}

export const allDemoDocuments: FixtureDemoDocument[] = [
  ...addRecordDemoDocuments,
  ...contractorDemoDocuments,
];
