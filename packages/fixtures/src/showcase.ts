import type { FixtureDocument, FixtureEvent, FixtureProperty } from "./types";

const doc = (
  name: string,
  kind: string,
  visibility: FixtureDocument["visibility"],
  text: string,
): FixtureDocument => ({ name, kind, visibility, text });

/**
 * 123 Main Street is the showcase record. Its history is deliberately shaped
 * so the three demo questions have real, citable answers:
 *
 *  - the roof question resolves to EV-0016/EV-0017/EV-0018 (2023 replacement,
 *    warranty and permit closure);
 *  - the basement question resolves to EV-0010 and EV-0011, where the record
 *    shows water intrusion *and* the grading correction that followed — so the
 *    honest answer is "yes, twice, and here is what was done", never
 *    "it has never flooded";
 *  - the replacement question resolves to the HVAC card sitting at WATCH with
 *    EV-0022's technician note behind it.
 */
const showcaseEvents: FixtureEvent[] = [
  {
    id: "EV-0001",
    occurredAt: "1994-06-01",
    eventType: "PROPERTY_CREATED",
    title: "Property record created",
    meta: "Denver County Assessor · parcel DEN-1234-567-89",
    description:
      "Initial assessor record for new construction completed in 1994.",
    verificationLevel: "SOURCE_VERIFIED",
    visibility: "PUBLIC",
    documents: [],
  },
  {
    id: "EV-0002",
    occurredAt: "1994-08-14",
    eventType: "OWNERSHIP_PERIOD_STARTED",
    title: "Ownership period #1 begins",
    meta: "Prior owners are not named in the property record.",
    description: "",
    verificationLevel: "UNVERIFIED",
    visibility: "PUBLIC",
    documents: [],
  },
  {
    id: "EV-0003",
    occurredAt: "2004-04-03",
    eventType: "REPAIR",
    title: "Roof replacement",
    meta: "Contractor not recorded · $9,200",
    description:
      "Historic entry imported from prior owner records. Materials and warranty were not recorded.",
    verificationLevel: "UNVERIFIED",
    visibility: "AUTHENTICATED",
    documents: [],
  },
  {
    id: "EV-0004",
    occurredAt: "2008-07-18",
    eventType: "SALE",
    title: "Sale · $379,000",
    meta: "Arms-length transaction · Denver County Recorder",
    description: "",
    verificationLevel: "SOURCE_VERIFIED",
    visibility: "PUBLIC",
    documents: [
      doc(
        "Recorded deed",
        "Deed",
        "PUBLIC",
        "DENVER COUNTY CLERK & RECORDER\nInstrument 2008-0091423\n\nProperty: 123 Main Street, Denver, CO 80206\nParcel: DEN-1234-567-89\nRecorded: July 18, 2008\nConsideration: $379,000\nTransaction type: Arms-length\n\nGrantor and grantee names are withheld from the HomeFax display layer.",
      ),
    ],
  },
  {
    id: "EV-0005",
    occurredAt: "2008-07-18",
    eventType: "OWNERSHIP_PERIOD_STARTED",
    title: "Ownership period #2 begins",
    meta: "Ownership period #1 closed on the same date.",
    description: "",
    verificationLevel: "SOURCE_VERIFIED",
    visibility: "PUBLIC",
    documents: [],
  },
  {
    id: "EV-0006",
    occurredAt: "2012-09-10",
    eventType: "SYSTEM_INSTALLATION",
    title: "HVAC installation",
    meta: "Summit Mechanical · $6,400",
    description:
      "3-ton split system with 80% efficiency furnace. Expected service life 18 years.",
    verificationLevel: "PROFESSIONAL_VERIFIED",
    visibility: "AUTHENTICATED",
    documents: [
      doc(
        "Installation invoice",
        "Invoice",
        "AUTHENTICATED",
        "SUMMIT MECHANICAL\nInvoice 12-4417 · September 10, 2012\n\n123 Main Street, Denver, CO 80206\n\nSupply and install 3-ton split system\nFurnace, 80% efficiency\nNew line set and thermostat\n\nTotal: $6,400.00\nLabor warranty: 2 years",
      ),
    ],
  },
  {
    id: "EV-0007",
    occurredAt: "2014-03-22",
    eventType: "INSURANCE_CLAIM",
    title: "Water damage claim recorded",
    meta: "Carrier record · restricted",
    description:
      "Claim record is retained at restricted visibility and is not shown in public views.",
    verificationLevel: "SOURCE_VERIFIED",
    visibility: "RESTRICTED",
    documents: [
      doc(
        "Claim summary",
        "Claim",
        "RESTRICTED",
        "Restricted document. Not available in the demo viewer.",
      ),
    ],
  },
  {
    id: "EV-0008",
    occurredAt: "2016-05-04",
    eventType: "PERMIT_ISSUED",
    title: "Basement remodel permit issued",
    meta: "City & County of Denver · Permit B16-09921",
    description: "Finished basement with egress window and bathroom rough-in.",
    verificationLevel: "SOURCE_VERIFIED",
    visibility: "PUBLIC",
    documents: [
      doc(
        "Permit record",
        "Permit",
        "PUBLIC",
        "CITY & COUNTY OF DENVER\nBuilding permit B16-09921\nIssued: May 4, 2016\n\nScope: Finish basement, 640 sqft. Egress window, bathroom rough-in,\nelectrical branch circuits.\n\nStatus at issue: Active",
      ),
    ],
  },
  {
    id: "EV-0009",
    occurredAt: "2016-06-18",
    eventType: "IMPROVEMENT",
    title: "Basement remodel completed",
    meta: "Front Range Builders · $41,000",
    description:
      "Partial supply plumbing replaced during remodel. Final inspection passed June 18, 2016.",
    verificationLevel: "PROFESSIONAL_VERIFIED",
    visibility: "AUTHENTICATED",
    documents: [
      doc(
        "Final invoice",
        "Invoice",
        "AUTHENTICATED",
        "FRONT RANGE BUILDERS\nInvoice 2016-338 · June 18, 2016\n\nBasement finish, 640 sqft\nPartial supply plumbing replacement (PEX)\nEgress window install\n\nTotal: $41,000.00",
      ),
    ],
  },
  {
    id: "EV-0010",
    occurredAt: "2018-06-10",
    eventType: "REPAIR",
    title: "Basement water intrusion repair",
    meta: "Front Range Waterproofing · $7,850",
    description:
      "Water intrusion observed at the northwest corner after heavy rainfall. Interior drain tile section replaced and sump pump added. Contractor identified exterior grading as the contributing cause.",
    verificationLevel: "PROFESSIONAL_VERIFIED",
    visibility: "AUTHENTICATED",
    documents: [
      doc(
        "Repair invoice",
        "Invoice",
        "AUTHENTICATED",
        "FRONT RANGE WATERPROOFING\nInvoice W18-2210 · June 10, 2018\n\nCause noted: negative grade at northwest corner directing runoff\ntoward foundation wall.\n\nWork performed:\n- Replace 22 ft interior drain tile\n- Install sump pit and 1/3 hp pump\n- Seal two cold joints\n\nTotal: $7,850.00\nRecommendation: correct exterior grading within 60 days.",
      ),
      doc(
        "Moisture report",
        "Report",
        "AUTHENTICATED",
        "Moisture readings taken June 10, 2018.\nNorthwest wall: elevated. All other walls: within normal range.\nNo evidence of structural movement observed.",
      ),
    ],
  },
  {
    id: "EV-0011",
    occurredAt: "2018-07-02",
    eventType: "IMPROVEMENT",
    title: "Exterior grading and drainage correction",
    meta: "Mile High Landscape · $5,300",
    description:
      "Regraded 40 feet of the north and west sides away from the foundation, added two downspout extensions and a dry well.",
    verificationLevel: "PROFESSIONAL_VERIFIED",
    visibility: "AUTHENTICATED",
    documents: [
      doc(
        "Work order",
        "Invoice",
        "AUTHENTICATED",
        "MILE HIGH LANDSCAPE\nWork order 4471 · July 2, 2018\n\nRegrade north and west elevations, 40 linear feet, to 6 in drop over 10 ft.\nTwo downspout extensions to 10 ft. One dry well.\n\nTotal: $5,300.00",
      ),
    ],
  },
  {
    id: "EV-0012",
    occurredAt: "2019-10-11",
    eventType: "SALE",
    title: "Sale · $515,000",
    meta: "Arms-length transaction · Denver County Recorder",
    description: "",
    verificationLevel: "SOURCE_VERIFIED",
    visibility: "PUBLIC",
    documents: [
      doc(
        "Recorded deed",
        "Deed",
        "PUBLIC",
        "DENVER COUNTY CLERK & RECORDER\nInstrument 2019-0142208\nRecorded: October 11, 2019\nConsideration: $515,000\nTransaction type: Arms-length",
      ),
    ],
  },
  {
    id: "EV-0013",
    occurredAt: "2019-10-11",
    eventType: "OWNERSHIP_PERIOD_STARTED",
    title: "Ownership period #3 begins",
    meta: "Current ownership period",
    description: "",
    verificationLevel: "SOURCE_VERIFIED",
    visibility: "PUBLIC",
    documents: [],
  },
  {
    id: "EV-0014",
    occurredAt: "2021-03-15",
    eventType: "IMPROVEMENT",
    title: "Electrical panel upgraded to 200A",
    meta: "Cap Hill Electric · $3,150 · Permit E21-04477",
    description:
      "Service upgraded from 100A to 200A. New main panel, meter socket and grounding electrode system.",
    verificationLevel: "SOURCE_VERIFIED",
    visibility: "PUBLIC",
    documents: [
      doc(
        "Invoice",
        "Invoice",
        "AUTHENTICATED",
        "CAP HILL ELECTRIC\nInvoice 21-0899 · March 15, 2021\n\n200A service upgrade\nNew main panel, 40 space\nMeter socket, mast, grounding\n\nTotal: $3,150.00",
      ),
      doc(
        "Permit E21-04477",
        "Permit",
        "PUBLIC",
        "CITY & COUNTY OF DENVER\nElectrical permit E21-04477\nIssued March 2, 2021 · Finaled March 19, 2021\nScope: Service upgrade 100A to 200A",
      ),
    ],
  },
  {
    id: "EV-0015",
    occurredAt: "2022-08-05",
    eventType: "SYSTEM_SERVICE",
    title: "HVAC service",
    meta: "Summit Mechanical · $215",
    description: "Annual service. Refrigerant topped, filters replaced.",
    verificationLevel: "PROFESSIONAL_VERIFIED",
    visibility: "AUTHENTICATED",
    documents: [
      doc(
        "Service invoice",
        "Invoice",
        "AUTHENTICATED",
        "SUMMIT MECHANICAL\nInvoice 22-7781 · August 5, 2022\n\nAnnual cooling service\nRefrigerant top-off, filter replacement\n\nTotal: $215.00",
      ),
    ],
  },
  {
    id: "EV-0016",
    occurredAt: "2023-05-14",
    eventType: "REPAIR",
    title: "Roof replacement",
    meta: "ABC Roofing LLC · $18,420 · Permit R23-18432",
    description:
      "Full tear-off and replacement. Owens Corning Duration shingles installed with synthetic underlayment and new ridge vent.",
    verificationLevel: "PROFESSIONAL_VERIFIED",
    visibility: "AUTHENTICATED",
    documents: [
      doc(
        "Invoice",
        "Invoice",
        "AUTHENTICATED",
        "ABC ROOFING LLC\nLicense CO-RF-88214\nInvoice 23-1187 · May 14, 2023\n\n123 Main Street, Denver, CO 80206\nPermit R23-18432\n\nFull tear-off, 28 squares\nOwens Corning Duration shingles\nSynthetic underlayment, ice and water shield at eaves\nNew ridge vent, pipe boots, drip edge\n\nTotal: $18,420.00\nWorkmanship warranty: 10 years\nMaterial warranty: 30 years, Owens Corning",
      ),
      doc(
        "Permit R23-18432",
        "Permit",
        "PUBLIC",
        "CITY & COUNTY OF DENVER\nRoofing permit R23-18432\nIssued May 8, 2023\nScope: Tear-off and reroof, asphalt shingle",
      ),
      doc(
        "Final inspection",
        "Inspection",
        "PUBLIC",
        "CITY & COUNTY OF DENVER\nInspection result: PASS\nDate: May 15, 2023\nInspector ID 4471\nPermit R23-18432 closed.",
      ),
    ],
  },
  {
    id: "EV-0017",
    occurredAt: "2023-05-14",
    eventType: "WARRANTY",
    title: "Roof warranty registered",
    meta: "Owens Corning · 30 year limited · expires 2053",
    description:
      "Registered to the property. Transferable once within the first 10 years.",
    verificationLevel: "PROFESSIONAL_VERIFIED",
    visibility: "AUTHENTICATED",
    documents: [
      doc(
        "Warranty certificate",
        "Warranty",
        "AUTHENTICATED",
        "OWENS CORNING\nLimited warranty certificate\nRegistration 30-CO-884219\n\nProduct: Duration series shingles\nInstalled: May 14, 2023\nTerm: 30 years limited, expires 2053\nTransferable: once, within 10 years of installation",
      ),
    ],
  },
  {
    id: "EV-0018",
    occurredAt: "2023-05-15",
    eventType: "PERMIT_FINALIZED",
    title: "Roof permit finalized",
    meta: "City & County of Denver · Permit R23-18432",
    description: "Final inspection passed. Permit closed.",
    verificationLevel: "SOURCE_VERIFIED",
    visibility: "PUBLIC",
    documents: [
      doc(
        "Permit record",
        "Permit",
        "PUBLIC",
        "CITY & COUNTY OF DENVER\nPermit R23-18432 · Status: FINALED\nFinal inspection May 15, 2023 · PASS",
      ),
    ],
  },
  {
    id: "EV-0019",
    occurredAt: "2024-02-09",
    eventType: "SYSTEM_INSTALLATION",
    title: "Water heater replacement",
    meta: "Mile High Plumbing Co. · $1,780",
    description:
      "50 gallon gas unit replacing the original 2009 heater. 6 year tank warranty.",
    verificationLevel: "OWNER_REPORTED",
    visibility: "AUTHENTICATED",
    documents: [
      doc(
        "Invoice",
        "Invoice",
        "AUTHENTICATED",
        "MILE HIGH PLUMBING CO.\nInvoice 24-0330 · February 9, 2024\n\nRemove and dispose existing 50 gal gas water heater\nInstall new 50 gal gas water heater\nNew expansion tank, pan and drain\n\nTotal: $1,780.00\nTank warranty: 6 years",
      ),
    ],
  },
  {
    id: "EV-0020",
    occurredAt: "2024-09-01",
    eventType: "TAX_ASSESSMENT",
    title: "Tax assessment · 2024",
    meta: "Denver County Assessor · Assessed $561,000 · Tax $4,488.05",
    description: "",
    verificationLevel: "SOURCE_VERIFIED",
    visibility: "PUBLIC",
    documents: [],
  },
  {
    id: "EV-0021",
    occurredAt: "2025-09-01",
    eventType: "TAX_ASSESSMENT",
    title: "Tax assessment · 2025",
    meta: "Denver County Assessor · Assessed $589,400 · Tax $4,702.18",
    description: "",
    verificationLevel: "SOURCE_VERIFIED",
    visibility: "PUBLIC",
    documents: [],
  },
  {
    id: "EV-0022",
    occurredAt: "2026-04-12",
    eventType: "SYSTEM_SERVICE",
    title: "HVAC service",
    meta: "Summit Mechanical · $289",
    description:
      "Condenser coil cleaned, start capacitor replaced. Technician noted the compressor is nearing the end of its expected service life.",
    verificationLevel: "PROFESSIONAL_VERIFIED",
    visibility: "AUTHENTICATED",
    documents: [
      doc(
        "Service invoice",
        "Invoice",
        "AUTHENTICATED",
        "SUMMIT MECHANICAL\nInvoice 26-2214 · April 12, 2026\n\nCondenser coil cleaning\nStart capacitor replacement\n\nTechnician note: compressor amp draw elevated; unit is 13 years old\nagainst an 18 year expected life. Budget for replacement.\n\nTotal: $289.00",
      ),
    ],
  },
  {
    id: "EV-0023",
    occurredAt: "2026-08-01",
    eventType: "TAX_ASSESSMENT",
    title: "Tax assessment · 2026",
    meta: "Denver County Assessor · Assessed $612,000 · Tax $4,875.32",
    description: "",
    verificationLevel: "SOURCE_VERIFIED",
    visibility: "PUBLIC",
    documents: [
      doc(
        "Assessment notice",
        "Notice",
        "PUBLIC",
        "DENVER COUNTY ASSESSOR\n2026 Notice of Valuation\n\nParcel DEN-1234-567-89\nActual value: $612,000\nTax levied: $4,875.32",
      ),
    ],
  },
  {
    id: "EV-0024",
    occurredAt: "2026-08-20",
    eventType: "INSPECTION",
    title: "Pre-listing inspection",
    meta: "Front Range Home Inspection · Pass with notes",
    description:
      "Minor grading concern noted on the north side. Water heater within expected service interval. No foundation movement observed.",
    verificationLevel: "PROFESSIONAL_VERIFIED",
    visibility: "AUTHENTICATED",
    documents: [
      doc(
        "Inspection summary",
        "Report",
        "AUTHENTICATED",
        "FRONT RANGE HOME INSPECTION\nPre-listing inspection · August 20, 2026\n\nOverall: PASS WITH NOTES\n\nObservations:\n1. Minor grading concern on north side; monitor after heavy rain.\n2. Water heater within expected service interval.\n\nNo foundation movement observed. Roof in excellent condition,\ninstalled 2023. HVAC condenser aging; plan for replacement.",
      ),
    ],
  },
];

export const showcaseProperty: FixtureProperty = {
  tokenId: "HF-US-CO-DEN-00001234",
  address: "123 Main Street",
  city: "Denver",
  state: "CO",
  postalCode: "80206",
  parcelId: "DEN-1234-567-89",
  propertyType: "Single family, detached",
  yearBuilt: 1994,
  bedrooms: 4,
  bathrooms: 3,
  livingSqft: 2880,
  lotSqft: 7500,
  estimatedValue: 685000,
  isShowcase: true,
  mlsNumber: "9182446",
  // The only parcel with a deed name on file. DeedProvider returns null for
  // everything else, which is what keeps the proof-of-ownership review path
  // reachable in the demo.
  ownerOfRecord: "Dana Whitfield",
  events: showcaseEvents,
  systems: [
    {
      key: "roof",
      name: "Roof",
      status: "EXCELLENT",
      verificationLevel: "PROFESSIONAL_VERIFIED",
      sourceEventId: "EV-0016",
      hidden: false,
      rows: [
        ["Installed", "May 14, 2023"],
        ["Warranty", "30 yrs · to 2053"],
        ["Est. remaining", "27 yrs"],
      ],
    },
    {
      key: "hvac",
      name: "HVAC",
      status: "WATCH",
      verificationLevel: "PROFESSIONAL_VERIFIED",
      sourceEventId: "EV-0022",
      hidden: false,
      rows: [
        ["Installed", "Sep 10, 2012"],
        ["Last service", "Apr 12, 2026"],
        ["Est. remaining", "4 yrs of 18"],
      ],
    },
    {
      key: "waterHeater",
      name: "Water Heater",
      status: "EXCELLENT",
      verificationLevel: "OWNER_REPORTED",
      sourceEventId: "EV-0019",
      hidden: false,
      rows: [
        ["Installed", "Feb 9, 2024"],
        ["Type", "50 gal gas"],
        ["Est. remaining", "10 yrs of 12"],
      ],
    },
    {
      key: "electrical",
      name: "Electrical",
      status: "EXCELLENT",
      verificationLevel: "SOURCE_VERIFIED",
      sourceEventId: "EV-0014",
      hidden: false,
      rows: [
        ["Panel upgrade", "Mar 15, 2021"],
        ["Service", "200A"],
        ["Est. remaining", "35 yrs of 40"],
      ],
    },
    {
      key: "plumbing",
      name: "Plumbing",
      status: "EXCELLENT",
      verificationLevel: "PROFESSIONAL_VERIFIED",
      sourceEventId: "EV-0009",
      hidden: false,
      rows: [
        ["Original", "1994"],
        ["Partial replace", "Jun 18, 2016"],
        ["Last inspected", "Aug 20, 2026"],
      ],
    },
    {
      key: "foundation",
      name: "Foundation",
      status: "EXCELLENT",
      verificationLevel: "PROFESSIONAL_VERIFIED",
      sourceEventId: "EV-0011",
      hidden: false,
      rows: [
        ["Type", "Poured concrete"],
        ["Drainage corrected", "Jul 2, 2018"],
        ["Last inspected", "Aug 20, 2026"],
      ],
    },
    {
      key: "other",
      name: "Other",
      status: "EXCELLENT",
      verificationLevel: "PROFESSIONAL_VERIFIED",
      sourceEventId: "EV-0024",
      hidden: true,
      rows: [],
    },
  ],
  ownership: [
    {
      sequenceNumber: 3,
      label: "Current ownership period",
      rangeLabel: "Oct 11, 2019 – present",
      verificationLevel: "SOURCE_VERIFIED",
      isCurrent: true,
    },
    {
      sequenceNumber: 2,
      label: "Ownership period #2",
      rangeLabel: "Jul 18, 2008 – Oct 11, 2019",
      verificationLevel: "SOURCE_VERIFIED",
      isCurrent: false,
    },
    {
      sequenceNumber: 1,
      label: "Ownership period #1",
      rangeLabel: "Aug 14, 1994 – Jul 18, 2008",
      verificationLevel: "UNVERIFIED",
      isCurrent: false,
    },
  ],
};
