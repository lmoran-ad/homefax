import type { FixtureContractor } from "./types";

/**
 * Mile High Landscape is deliberately unverified. Its license is not on file,
 * so LicenseProvider returns unverified, its card carries the amber border and
 * a red license value, and anything it submits downgrades to OWNER_REPORTED
 * rather than PROFESSIONAL_VERIFIED. That downgrade path is the point of the
 * verification model, so it has to stay exercisable.
 */
export const fixtureContractors: FixtureContractor[] = [
  {
    id: "C-SUMMIT",
    name: "Summit Mechanical",
    initials: "SM",
    trade: "HVAC",
    license: "CO-MC-31188",
    verified: true,
    since: "Verified source since 2019",
    area: "Denver metro",
    zips: "80206, 80212, 80220",
    jobCount: 34,
    phone: "(303) 555-0148",
    blurb:
      "Residential heating and cooling. Installed and serviced the system at 123 Main Street, so the full service history for that unit is already in the record.",
  },
  {
    id: "C-ABC",
    name: "ABC Roofing LLC",
    initials: "AR",
    trade: "Roofing",
    license: "CO-RF-88214",
    verified: true,
    since: "Verified source since 2021",
    area: "Front Range",
    zips: "80206, 80210, 80231",
    jobCount: 61,
    phone: "(303) 555-0192",
    blurb:
      "Tear-off and reroof, asphalt and metal. Registers manufacturer warranties to the property rather than the owner.",
  },
  {
    id: "C-MHP",
    name: "Mile High Plumbing Co.",
    initials: "MP",
    trade: "Plumbing",
    license: "CO-PL-44902",
    verified: true,
    since: "Verified source since 2020",
    area: "Denver metro",
    zips: "80206, 80211, 80246",
    jobCount: 47,
    phone: "(303) 555-0110",
    blurb:
      "Supply, drain and water heater work. Submits invoices with model and serial numbers so replacement dates stay verifiable.",
  },
  {
    id: "C-CHE",
    name: "Cap Hill Electric",
    initials: "CE",
    trade: "Electrical",
    license: "CO-EL-20551",
    verified: true,
    since: "Verified source since 2022",
    area: "Central Denver",
    zips: "80206, 80218",
    jobCount: 29,
    phone: "(303) 555-0173",
    blurb:
      "Service upgrades and panel replacement. Pulls permits under its own license and attaches the finaled permit to the record.",
  },
  {
    id: "C-FRW",
    name: "Front Range Waterproofing",
    initials: "FW",
    trade: "Foundation & Waterproofing",
    license: "CO-GC-77310",
    verified: true,
    since: "Verified source since 2018",
    area: "Front Range",
    zips: "80206, 80212",
    jobCount: 18,
    phone: "(303) 555-0126",
    blurb:
      "Drain tile, sump systems and foundation sealing. Documents the cause it identified, not only the work performed.",
  },
  {
    id: "C-FRB",
    name: "Front Range Builders",
    initials: "FB",
    trade: "General Contracting",
    license: "CO-GC-11284",
    verified: true,
    since: "Verified source since 2017",
    area: "Denver metro",
    zips: "80206, 80220, 80246",
    jobCount: 22,
    phone: "(303) 555-0155",
    blurb:
      "Additions and whole-room remodels. Submits the finaled permit alongside the invoice.",
  },
  {
    id: "C-DSS",
    name: "Denver Sewer Scope",
    initials: "DS",
    trade: "Inspection",
    license: "CO-IN-6620",
    verified: true,
    since: "Verified source since 2023",
    area: "Denver metro",
    zips: "80206, 80211, 80231",
    jobCount: 90,
    phone: "(303) 555-0181",
    blurb:
      "Sewer line scoping for listings and purchases. Reports include line material and transition depth.",
  },
  {
    id: "C-MHL",
    name: "Mile High Landscape",
    initials: "ML",
    trade: "Landscape & Drainage",
    license: "Not on file",
    verified: false,
    since: "Applied Aug 2026",
    area: "Denver metro",
    zips: "80206, 80212",
    jobCount: 6,
    phone: "(303) 555-0137",
    blurb:
      "Grading, drainage correction and hardscape. License verification is pending, so submissions from this company are recorded as Owner Reported until it completes.",
  },
];

export const CONTRACTOR_TRADES = [
  "All",
  ...Array.from(new Set(fixtureContractors.map((c) => c.trade))),
];
