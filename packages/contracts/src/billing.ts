import { z } from "zod";
import { BillingCycleSchema, PaywallGateSchema, PlanSchema } from "./enums";

export const PlanFeatureSchema = z.object({
  label: z.string(),
  included: z.boolean(),
});

export const PlanCardSchema = z.object({
  id: PlanSchema,
  audience: z.string(),
  name: z.string(),
  monthly: z.string(),
  annual: z.string(),
  unit: z.string(),
  pitch: z.string(),
  features: z.array(PlanFeatureSchema),
  cta: z.string(),
  footnote: z.string(),
  flag: z.string().nullable(),
  primary: z.boolean(),
});
export type PlanCard = z.infer<typeof PlanCardSchema>;

export const PaywallSchema = z.object({
  key: PaywallGateSchema,
  tierLabel: z.string(),
  planLine: z.string(),
  title: z.string(),
  body: z.string(),
  bullets: z.array(z.string()),
  cta: z.string(),
});
export type Paywall = z.infer<typeof PaywallSchema>;

export const SubscriptionSchema = z.object({
  plan: PlanSchema,
  planName: z.string(),
  price: z.string(),
  cycle: BillingCycleSchema,
  status: z.enum(["ACTIVE", "CANCELS SOON", "FREE"]),
  renewsOn: z.string().nullable(),
  accessEndsOn: z.string().nullable(),
  paymentMethod: z.string().nullable(),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const UpgradeRequestSchema = z.object({
  plan: PlanSchema,
  cycle: BillingCycleSchema.default("monthly"),
});
export type UpgradeRequest = z.infer<typeof UpgradeRequestSchema>;

export const UnitEconomicsRowSchema = z.object({
  line: z.string(),
  price: z.string(),
  units: z.string(),
  annual: z.string(),
  dependsOn: z.string(),
});
export type UnitEconomicsRow = z.infer<typeof UnitEconomicsRowSchema>;
