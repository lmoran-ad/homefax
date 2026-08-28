import type { FixtureAccount } from "./types.js";

/**
 * All three demo accounts share one password. That is a demo affordance, not a
 * pattern to carry forward — passwords are hashed with scrypt on seed, and the
 * auth boundary is replaceable with SSO without touching route contracts.
 */
export const DEMO_PASSWORD = "demo-password";

export const fixtureAccounts: FixtureAccount[] = [
  {
    email: "agent@hometoken.demo",
    password: DEMO_PASSWORD,
    name: "Alex Morgan",
    initials: "AM",
    role: "agent",
    roleLabel: "REAL / REMAX Demo Agent",
    avatarBg: "#0b2c52",
    badge: "AGENT",
    badgeBg: "#e8f0fb",
    badgeFg: "#1a4f9c",
    kicker: "AGENT SIGN IN",
    blurb:
      "Sign in with your REAL / REMAX agent credentials to search HomeTokens.",
    phone: "(303) 555-0101",
    brokerage: "REAL / REMAX Demo Brokerage",
    landingRoute: "/dashboard",
    homeTokenId: null,
    contractorId: null,
  },
  {
    email: "owner@hometoken.demo",
    password: DEMO_PASSWORD,
    name: "Dana Whitfield",
    initials: "DW",
    role: "homeowner",
    roleLabel: "Homeowner · 123 Main Street",
    avatarBg: "#12693b",
    badge: "HOMEOWNER",
    badgeBg: "#e7f4ec",
    badgeFg: "#12693b",
    kicker: "HOMEOWNER SIGN IN",
    blurb:
      "Sign in to see your home's record, find a verified contractor, and approve what enters your HomeToken.",
    phone: "(303) 555-0164",
    brokerage: null,
    landingRoute: "/properties/HT-US-CO-DEN-00001234",
    homeTokenId: "HT-US-CO-DEN-00001234",
    contractorId: null,
  },
  {
    email: "summit@hometoken.demo",
    password: DEMO_PASSWORD,
    name: "Marcus Vale",
    initials: "MV",
    role: "contractor",
    roleLabel: "Summit Mechanical · Verified Source",
    avatarBg: "#8a5a06",
    badge: "VERIFIED SOURCE",
    badgeBg: "#fdf3e2",
    badgeFg: "#8a5a06",
    kicker: "CONTRACTOR SIGN IN",
    blurb:
      "Sign in to accept homeowner requests and submit completed work directly into a property record.",
    phone: "(303) 555-0148",
    brokerage: null,
    landingRoute: "/jobs",
    homeTokenId: null,
    contractorId: "C-SUMMIT",
  },
];
