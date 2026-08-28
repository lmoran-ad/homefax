import { z } from "zod";
import { PlanSchema, RoleSchema } from "./enums.js";

export const LoginRequestSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  keepSignedIn: z.boolean().default(true),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const SessionUserSchema = z.object({
  id: z.string(),
  role: RoleSchema,
  name: z.string(),
  initials: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  roleLabel: z.string(),
  avatarBg: z.string(),
  badge: z.string(),
  plan: PlanSchema,
  planName: z.string(),
  planPrice: z.string(),
  subscriptionCancelled: z.boolean(),
  /** Homeowner's own property, when they have one. */
  homeTokenId: z.string().nullable(),
  /** Contractor's company record, when they have one. */
  contractorId: z.string().nullable(),
  /** Route this role lands on after sign-in. */
  landingRoute: z.string(),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;

export const DemoAccountSchema = z.object({
  name: z.string(),
  initials: z.string(),
  email: z.string(),
  role: RoleSchema,
  roleLabel: z.string(),
  avatarBg: z.string(),
  badge: z.string(),
  badgeBg: z.string(),
  badgeFg: z.string(),
  kicker: z.string(),
  blurb: z.string(),
});
export type DemoAccount = z.infer<typeof DemoAccountSchema>;

export const UpdateProfileRequestSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(120),
  email: z.email("Enter a valid email address"),
  phone: z.string().max(40).nullable().default(null),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export const ChangePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    error: "The new passwords do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
