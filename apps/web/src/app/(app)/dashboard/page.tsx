import Link from "next/link";
import type {
  Claim,
  HomeClaim,
  Job,
  PropertySummary,
  SessionUser,
} from "@hometoken/contracts";
import { ButtonLink } from "@/components/buttons";
import { ClaimPanel } from "@/components/claim-panel";
import { PageShell, PageHeading, SectionRule } from "@/components/page-shell";
import { PropertyCard } from "@/components/property-cards";
import { SearchCard } from "@/components/search-card";
import { ClaimBadge, EmptyState, Mono, Pill } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { firstName, greeting } from "@/lib/format";

export const dynamic = "force-dynamic";

type DashboardResponse =
  | {
      role: "agent";
      recent: PropertySummary[];
      book: { property: PropertySummary; claim: Claim }[];
    }
  | {
      role: "homeowner";
      recent: PropertySummary[];
      homes: { property: PropertySummary; claim: HomeClaim }[];
    }
  | {
      role: "contractor";
      recent: PropertySummary[];
      jobs: Job[];
      stats: Record<string, number>;
    };

const LEAD: Record<string, string> = {
  agent:
    "Search any HomeToken, claim stewardship of a listing, and compile a record a buyer can actually read.",
  homeowner:
    "Your home's record, its Home Health, and everything waiting for your approval.",
  contractor:
    "Accept homeowner requests and submit completed work straight into a property record.",
};

export default async function DashboardPage() {
  const [{ user }, data] = await Promise.all([
    apiFetch<{ user: SessionUser }>("/auth/me"),
    apiFetch<DashboardResponse>("/dashboard"),
  ]);

  return (
    <PageShell>
      <PageHeading
        title={`Good ${greeting()}, ${firstName(user.name)}`}
        lead={LEAD[user.role]}
      />

      {data.role === "agent" ? (
        <>
          <SearchCard />
          <div className="mt-[22px]">
            <ClaimPanel role="agent" />
          </div>

          <SectionRule>Your book</SectionRule>
          {data.book.length === 0 ? (
            <EmptyState
              title="No HomeTokens under your stewardship"
              body="Claim a listing by MLS number, seller authorization or title at closing to start contributing to its record."
              action={<ButtonLink href="/properties">Browse properties</ButtonLink>}
            />
          ) : (
            <div className="space-y-[10px]">
              {data.book.map(({ property, claim }) => (
                <Link
                  key={property.tokenId}
                  href={`/properties/${property.tokenId}`}
                  className="flex flex-wrap items-center gap-x-[18px] gap-y-[8px] rounded-[14px] border border-line bg-white p-[16px_20px] no-underline hover:border-navy"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-bold text-ink">
                      {property.address}
                    </div>
                    <div className="mt-[3px] truncate text-[13px] text-muted">
                      {property.city}, {property.state} · <Mono>{property.tokenId}</Mono>
                    </div>
                  </div>
                  <ClaimBadge state={claim.status === "pending" ? "pending" : "active"} />
                  <div className="text-[13px] text-muted">
                    {property.eventCount} events
                  </div>
                  {claim.daysUntilExpiry === null ? null : (
                    <div className="text-[11px] font-bold tracking-[0.1em] text-amber">
                      EXPIRES IN {claim.daysUntilExpiry} DAYS
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      ) : null}

      {data.role === "homeowner" ? (
        <>
          <ClaimPanel role="homeowner" />

          <SectionRule>Your homes</SectionRule>
          {data.homes.length === 0 ? (
            <EmptyState
              title="No verified homes yet"
              body="Add your address above and verify ownership against the county deed, or upload proof for recorder review."
            />
          ) : (
            <div className="space-y-[10px]">
              {data.homes.map(({ property, claim }) => (
                <Link
                  key={property.tokenId}
                  href={`/properties/${property.tokenId}`}
                  className="flex flex-wrap items-center gap-x-[18px] gap-y-[8px] rounded-[14px] border border-line bg-white p-[16px_20px] no-underline hover:border-navy"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-bold text-ink">
                      {property.address}
                    </div>
                    <div className="mt-[3px] truncate text-[13px] text-muted">
                      {property.city}, {property.state} · <Mono>{property.tokenId}</Mono>
                    </div>
                  </div>
                  <Pill
                    label={claim.status === "active" ? "VERIFIED OWNER" : "VERIFICATION PENDING"}
                    bg={claim.status === "active" ? "#e7f4ec" : "#fdf3e2"}
                    fg={claim.status === "active" ? "#12693b" : "#8a5a06"}
                    line={claim.status === "active" ? "#cfe6d9" : "#f2dcb4"}
                  />
                  <div className="text-[13px] text-muted">
                    Health {property.healthScore ?? "—"} /100
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : null}

      {data.role === "contractor" ? (
        <EmptyState
          title="Your workspace is Jobs"
          body="Accept homeowner requests and submit completed work from there. Contractors do not contribute from a property record."
          action={<ButtonLink href="/jobs">Go to Jobs</ButtonLink>}
        />
      ) : null}

      <SectionRule>Recent HomeTokens</SectionRule>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
        {data.recent.map((property) => (
          <PropertyCard key={property.tokenId} property={property} />
        ))}
      </div>
    </PageShell>
  );
}
