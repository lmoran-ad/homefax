"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PropertyDetail, Role } from "@homefax/contracts";
import { PhotoPlaceholder } from "./brand";
import { Button, ButtonLink } from "./buttons";
import { useToast } from "./feedback";
import { Mono } from "./ui";
import { request } from "@/lib/client";
import { formatMoney } from "@/lib/format";

export function PropertyHero({
  property,
  role,
  saved,
  canContribute,
}: {
  property: PropertyDetail;
  role: Role;
  saved: boolean;
  canContribute: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(saved);

  const facts = property.facts;
  const factLine = [
    `${facts.bedrooms} Bed`,
    `${facts.bathrooms} Bath`,
    `${facts.livingSqft.toLocaleString("en-US")} sqft`,
    facts.lotSqft ? `${facts.lotSqft.toLocaleString("en-US")} sqft lot` : null,
    `Built ${facts.yearBuilt}`,
  ]
    .filter(Boolean)
    .join("  |  ");

  async function copyToken() {
    await navigator.clipboard.writeText(property.tokenId).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function toggleSave() {
    const next = !isSaved;
    setIsSaved(next);
    try {
      await request(`/properties/${property.tokenId}/save`, { method: "POST" });
      toast(next ? "Saved." : "Removed from saved.");
      router.refresh();
    } catch {
      setIsSaved(!next);
      toast("Could not update your saved list.");
    }
  }

  return (
    <section
      data-testid="property-hero"
      className="track-min-0 grid overflow-hidden rounded-[16px] border border-line bg-white lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
    >
      <PhotoPlaceholder className="min-h-[290px] w-full" />

      <div className="min-w-0 p-[26px_28px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1
            data-testid="property-address"
            className="m-0 text-[clamp(26px,3.6vw,36px)] leading-[1.1] font-extrabold tracking-[-0.03em] text-ink"
          >
            {property.address}
          </h1>
          {/* Saving is a bookmark and an agent-only affordance. */}
          {role === "agent" ? (
            <button
              type="button"
              onClick={() => void toggleSave()}
              data-testid="save-toggle"
              data-saved={isSaved}
              className="shrink-0 cursor-pointer rounded-[8px] border border-line bg-white px-[12px] py-[7px] text-[13px] font-bold text-body hover:border-navy hover:text-navy"
            >
              {isSaved ? "★ Saved" : "☆ Save"}
            </button>
          ) : null}
        </div>

        <div className="mt-[6px] text-[14.5px] text-muted">
          {property.city}, {property.state} {property.postalCode} ·{" "}
          {facts.propertyType}
        </div>

        <div className="mt-[20px] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[16px]">
          <div className="min-w-0">
            <div className="text-[10.5px] font-bold tracking-[0.14em] text-softer">
              HOMEFAX ID
            </div>
            <div className="mt-[5px] flex flex-wrap items-center gap-[8px]">
              <Mono className="text-[13px] font-medium break-all text-link">
                <span data-testid="property-token-id">{property.tokenId}</span>
              </Mono>
              <button
                type="button"
                onClick={() => void copyToken()}
                data-testid="copy-token-button"
                className="shrink-0 cursor-pointer rounded-[6px] border border-line bg-card px-[8px] py-[3px] text-[11px] font-bold text-muted hover:border-navy hover:text-navy"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[10.5px] font-bold tracking-[0.14em] text-softer">
              PARCEL
            </div>
            <Mono className="mt-[5px] block text-[13px] break-all text-body">
              {property.parcelId}
            </Mono>
          </div>
        </div>

        <div className="mt-[22px] flex flex-wrap items-baseline gap-x-[16px] gap-y-[4px]">
          <div>
            <div className="text-[10.5px] font-bold tracking-[0.14em] text-softer">
              ESTIMATED VALUE
            </div>
            <div
              data-testid="property-value"
              className="mt-[4px] text-[clamp(28px,4vw,38px)] leading-none font-extrabold tracking-[-0.03em] text-ink"
            >
              {formatMoney(property.estimatedValue)}
            </div>
          </div>
          <div className="text-[12.5px] text-faint">
            Informational estimate · not an appraisal
          </div>
        </div>

        <div className="mt-[18px] border-t border-line-light pt-[16px] text-[13.5px] font-semibold text-body">
          {factLine}
        </div>

        <div className="mt-[20px] flex flex-wrap gap-[10px]">
          <ButtonLink href={`/properties/${property.tokenId}/ask`} testId="hero-ask">
            Ask This Home
          </ButtonLink>
          <ButtonLink
            href={`/properties/${property.tokenId}/add-record`}
            variant="outline"
            testId="hero-add-record"
          >
            Add Record
          </ButtonLink>
          {role === "agent" ? (
            <ButtonLink
              href={`/properties/${property.tokenId}/transfer`}
              variant="outline"
            >
              Transfer HomeFax
            </ButtonLink>
          ) : null}
          {!canContribute ? (
            <span className="self-center text-[12.5px] text-faint">
              Read-only until this record is claimed
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ReVerifyButton({ tokenId }: { tokenId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      testId="re-verify-button"
      onClick={async () => {
        setBusy(true);
        try {
          // Recomputes the entire chain server-side rather than trusting a
          // cached flag, which is the only way the check means anything.
          const { ledger } = await request<{ ledger: { valid: boolean; checkedEvents: number } }>(
            `/properties/${tokenId}/ledger/verify`,
          );
          toast(
            ledger.valid
              ? `Ledger verified. ${ledger.checkedEvents} events checked.`
              : "Ledger integrity warning — the record has been altered.",
          );
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Verifying…" : "Re-verify"}
    </Button>
  );
}

export function ClaimActionButton({
  tokenId,
  claimStateKey,
  role,
}: {
  tokenId: string;
  claimStateKey: string;
  role: Role;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  if (claimStateKey === "active" && role === "agent") {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await request(`/properties/${tokenId}/release`, { method: "POST" });
            toast("Stewardship released. The property record is unchanged.");
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Releasing…" : "Release"}
      </Button>
    );
  }

  if (claimStateKey === "pending") {
    return (
      <ButtonLink href={`/properties/${tokenId}/claim`} variant="outline" size="sm">
        Withdraw
      </ButtonLink>
    );
  }

  return (
    <ButtonLink href={`/properties/${tokenId}/claim`} size="sm">
      {role === "homeowner" ? "Verify ownership" : "Claim HomeFax"}
    </ButtonLink>
  );
}
