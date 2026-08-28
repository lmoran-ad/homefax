import { z } from "zod";

export const VERIFICATION_LEVELS = [
  "SOURCE_VERIFIED",
  "PROFESSIONAL_VERIFIED",
  "OWNER_REPORTED",
  "AI_EXTRACTED_PENDING",
  "UNVERIFIED",
] as const;
export const VerificationLevelSchema = z.enum(VERIFICATION_LEVELS);
export type VerificationLevel = z.infer<typeof VerificationLevelSchema>;

export const VISIBILITIES = ["PUBLIC", "AUTHENTICATED", "RESTRICTED"] as const;
export const VisibilitySchema = z.enum(VISIBILITIES);
export type Visibility = z.infer<typeof VisibilitySchema>;

export const SYSTEM_STATUSES = [
  "EXCELLENT",
  "GOOD",
  "WATCH",
  "ATTENTION",
  "UNKNOWN",
] as const;
export const SystemStatusSchema = z.enum(SYSTEM_STATUSES);
export type SystemStatus = z.infer<typeof SystemStatusSchema>;

export const SYSTEM_KEYS = [
  "roof",
  "hvac",
  "electrical",
  "plumbing",
  "foundation",
  "waterHeater",
  "other",
] as const;
export const SystemKeySchema = z.enum(SYSTEM_KEYS);
export type SystemKey = z.infer<typeof SystemKeySchema>;

export const EVENT_TYPES = [
  "PROPERTY_CREATED",
  "OWNERSHIP_PERIOD_STARTED",
  "OWNERSHIP_PERIOD_ENDED",
  "SALE",
  "LISTING",
  "TAX_ASSESSMENT",
  "TAX_PAYMENT",
  "PERMIT_ISSUED",
  "PERMIT_FINALIZED",
  "REPAIR",
  "IMPROVEMENT",
  "SYSTEM_INSTALLATION",
  "SYSTEM_SERVICE",
  "INSPECTION",
  "INSURANCE_CLAIM",
  "WARRANTY",
  "DOCUMENT_ADDED",
  "TRANSFER",
  "NOTE",
] as const;
export const EventTypeSchema = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof EventTypeSchema>;

/** Event types a person may author. The rest are produced by the system. */
export const AUTHORABLE_EVENT_TYPES = [
  "REPAIR",
  "IMPROVEMENT",
  "SYSTEM_INSTALLATION",
  "SYSTEM_SERVICE",
  "INSPECTION",
  "WARRANTY",
  "DOCUMENT_ADDED",
  "NOTE",
] as const;
export const AuthorableEventTypeSchema = z.enum(AUTHORABLE_EVENT_TYPES);
export type AuthorableEventType = z.infer<typeof AuthorableEventTypeSchema>;

export const TIMELINE_CATEGORIES = [
  "All",
  "Ownership",
  "Sales",
  "Repairs",
  "Improvements",
  "Permits",
  "Inspections",
  "Taxes",
  "Documents",
] as const;
export type TimelineCategory = (typeof TIMELINE_CATEGORIES)[number];

export const ROLES = ["agent", "homeowner", "contractor"] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

export const CLAIM_STATUSES = ["active", "pending", "expired", "released"] as const;
export const ClaimStatusSchema = z.enum(CLAIM_STATUSES);
export type ClaimStatus = z.infer<typeof ClaimStatusSchema>;

export const AGENT_CLAIM_METHODS = ["mls", "seller", "title"] as const;
export const AgentClaimMethodSchema = z.enum(AGENT_CLAIM_METHODS);
export type AgentClaimMethod = z.infer<typeof AgentClaimMethodSchema>;

export const OWNER_CLAIM_METHODS = ["record", "proof"] as const;
export const OwnerClaimMethodSchema = z.enum(OWNER_CLAIM_METHODS);
export type OwnerClaimMethod = z.infer<typeof OwnerClaimMethodSchema>;

export const PROOF_DOCUMENTS = [
  "County tax notice",
  "Recorded deed",
  "Utility bill",
] as const;
export const ProofDocumentSchema = z.enum(PROOF_DOCUMENTS);
export type ProofDocument = z.infer<typeof ProofDocumentSchema>;

export const JOB_STATUSES = [
  "requested",
  "accepted",
  "submitted",
  "approved",
  "declined",
] as const;
export const JobStatusSchema = z.enum(JOB_STATUSES);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const PLANS = [
  "free",
  "homeowner_plus",
  "agent_pro",
  "verified_source",
] as const;
export const PlanSchema = z.enum(PLANS);
export type Plan = z.infer<typeof PlanSchema>;

export const BILLING_CYCLES = ["monthly", "annual"] as const;
export const BillingCycleSchema = z.enum(BILLING_CYCLES);
export type BillingCycle = z.infer<typeof BillingCycleSchema>;

export const PAYWALL_GATES = [
  "export",
  "ask",
  "contractor",
  "api",
  "homeowner",
] as const;
export const PaywallGateSchema = z.enum(PAYWALL_GATES);
export type PaywallGate = z.infer<typeof PaywallGateSchema>;

export const CONFIDENCES = ["HIGH", "MEDIUM", "LOW"] as const;
export const ConfidenceSchema = z.enum(CONFIDENCES);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const EXTRACTION_STATUSES = [
  "PENDING",
  "PROCESSING",
  "READY_FOR_REVIEW",
  "APPROVED",
  "REJECTED",
  "FAILED",
] as const;
export const ExtractionStatusSchema = z.enum(EXTRACTION_STATUSES);
export type ExtractionStatus = z.infer<typeof ExtractionStatusSchema>;

/**
 * Which timeline filter an event falls under. Kept beside the enums because
 * both the API (filter counts) and the web (pill highlighting) must agree.
 */
export function categoryOfEvent(eventType: EventType): TimelineCategory {
  if (
    eventType.startsWith("OWNERSHIP") ||
    eventType === "TRANSFER" ||
    eventType === "PROPERTY_CREATED"
  ) {
    return "Ownership";
  }
  if (eventType === "SALE" || eventType === "LISTING") return "Sales";
  if (eventType === "REPAIR" || eventType === "SYSTEM_SERVICE") return "Repairs";
  if (eventType === "IMPROVEMENT" || eventType === "SYSTEM_INSTALLATION") {
    return "Improvements";
  }
  if (eventType.startsWith("PERMIT")) return "Permits";
  if (eventType === "INSPECTION") return "Inspections";
  if (eventType.startsWith("TAX")) return "Taxes";
  return "Documents";
}
