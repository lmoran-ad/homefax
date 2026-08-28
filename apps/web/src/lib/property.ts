import { cache } from "react";
import type {
  Claim,
  ClaimState,
  ContributeState,
  HomeClaim,
  PropertyDetail,
  SeededRecordStats,
  SessionUser,
} from "@homefax/contracts";
import { apiFetch } from "./api";

export type PropertyResponse = {
  property: PropertyDetail;
  claim: Claim | null;
  homeClaim: HomeClaim | null;
  claimState: ClaimState;
  contribute: ContributeState;
  saved: boolean;
  seededStats: SeededRecordStats;
};

/**
 * Deduped per request. The property sub-header, the tab body and the gate
 * panel all need the same payload, and `cache` means one fetch serves all of
 * them rather than three round trips per render.
 */
export const loadProperty = cache(
  async (tokenId: string): Promise<PropertyResponse> =>
    apiFetch<PropertyResponse>(`/properties/${tokenId}`),
);

export const loadSession = cache(
  async (): Promise<SessionUser> =>
    (await apiFetch<{ user: SessionUser }>("/auth/me")).user,
);
