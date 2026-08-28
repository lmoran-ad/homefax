import type {
  SystemStatus,
  VerificationLevel,
  JobStatus,
  ClaimStateKey,
} from "@hometoken/contracts";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${MONTHS[Number(month) - 1] ?? "?"} ${Number(day)}, ${year}`;
}

export function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

export type Chip = { label: string; bg: string; fg: string; line?: string };

export const VERIFICATION: Record<
  VerificationLevel,
  Chip & { description: string }
> = {
  SOURCE_VERIFIED: {
    label: "Source Verified",
    bg: "#e8f0fb",
    fg: "#1a4f9c",
    description: "Government, MLS, title or another directly integrated source.",
  },
  PROFESSIONAL_VERIFIED: {
    label: "Professional Verified",
    bg: "#e7f4ec",
    fg: "#12693b",
    description:
      "Licensed contractor, inspector, appraiser or authenticated agent.",
  },
  OWNER_REPORTED: {
    label: "Owner Reported",
    bg: "#eef1f4",
    fg: "#4a5663",
    description: "Submitted by a homeowner without independent verification.",
  },
  AI_EXTRACTED_PENDING: {
    label: "AI Extracted — Pending Verification",
    bg: "#fdf3e2",
    fg: "#8a5a06",
    description:
      "Read from a document by AI. Not verified until a person approves it.",
  },
  UNVERIFIED: {
    label: "Unverified",
    bg: "#f1f3f5",
    fg: "#6b7580",
    description:
      "Imported or historic data whose source cannot currently be verified.",
  },
};

export const SYSTEM_STATUS: Record<SystemStatus, Chip & { dot: string }> = {
  EXCELLENT: { label: "Excellent", bg: "#e7f4ec", fg: "#12693b", dot: "#12693b" },
  GOOD: { label: "Good", bg: "#e7f4ec", fg: "#12693b", dot: "#2f8f57" },
  WATCH: { label: "Watch", bg: "#fdf3e2", fg: "#8a5a06", dot: "#b5761a" },
  ATTENTION: { label: "Attention", bg: "#fdecee", fg: "#a8102a", dot: "#d1213c" },
  UNKNOWN: { label: "Unknown", bg: "#f1f3f5", fg: "#6b7580", dot: "#9aa5b1" },
};

export const JOB_STATUS: Record<JobStatus, Chip> = {
  requested: { label: "REQUESTED", bg: "#e8f0fb", fg: "#1a4f9c", line: "#cfe0f5" },
  accepted: {
    label: "CONTRACTOR ACCEPTED",
    bg: "#eef1f4",
    fg: "#4a5663",
    line: "#e3e7ec",
  },
  submitted: {
    label: "AWAITING HOMEOWNER ACCEPTANCE",
    bg: "#fdf3e2",
    fg: "#8a5a06",
    line: "#f2dcb4",
  },
  approved: {
    label: "ADDED TO HOMETOKEN",
    bg: "#e7f4ec",
    fg: "#12693b",
    line: "#cfe6d9",
  },
  declined: {
    label: "DECLINED BY HOMEOWNER",
    bg: "#fdecee",
    fg: "#a8102a",
    line: "#f5c2c8",
  },
};

export const CLAIM_STATE: Record<ClaimStateKey, Chip> = {
  unclaimed: { label: "UNCLAIMED", bg: "#f1f3f5", fg: "#6b7580", line: "#e3e7ec" },
  pending: {
    label: "CLAIM PENDING OWNER CONSENT",
    bg: "#fdf3e2",
    fg: "#8a5a06",
    line: "#f2dcb4",
  },
  other: {
    label: "CLAIMED BY ANOTHER AGENT",
    bg: "#eef1f4",
    fg: "#4a5663",
    line: "#e3e7ec",
  },
  active: {
    label: "YOU ARE THE STEWARD",
    bg: "#e7f4ec",
    fg: "#12693b",
    line: "#cfe6d9",
  },
};

/** `hash 8f2a…… · prev 1b0c……` — the mono footer under a timeline event. */
export function hashFooter(hash: string, previous: string | null): string {
  const prev = previous ?? "GENESIS";
  return `hash ${hash.slice(0, 24)}… · prev ${prev.slice(0, 16)}…`;
}
