"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PropertySummary } from "@homefax/contracts";
import { Button } from "./buttons";
import { useToast } from "./feedback";
import { Eyebrow, Mono, SectionHeading, Spinner } from "./ui";
import { ClientApiError, request } from "@/lib/client";

type Lookup =
  | { kind: "found"; property: PropertySummary }
  | { kind: "missing"; query: string };

/**
 * Address lookup with three outcomes: the parcel is already provisioned, it is
 * outside the pre-provisioned markets and can be pulled from county records,
 * or nothing has been looked up yet.
 *
 * The framing matters here — an agent is never creating a record, only
 * claiming authorization over one the county already holds.
 */
export function ClaimPanel({ role }: { role: "agent" | "homeowner" }) {
  const router = useRouter();
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<Lookup | null>(null);
  const [busy, setBusy] = useState(false);
  const [provisioning, setProvisioning] = useState(false);

  const isAgent = role === "agent";

  async function lookup() {
    if (!address.trim()) {
      setResult(null);
      return;
    }
    setBusy(true);
    try {
      setResult(
        await request<Lookup>(
          `/properties/lookup?address=${encodeURIComponent(address)}`,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function provision() {
    setProvisioning(true);
    try {
      const { property } = await request<{ property: PropertySummary }>(
        "/properties/provision",
        { method: "POST", body: { address } },
      );
      toast(`HomeFax provisioned for ${property.address}.`);
      router.push(`/properties/${property.tokenId}`);
    } catch (error) {
      toast(
        error instanceof ClientApiError
          ? error.error.message
          : "Could not provision that parcel.",
      );
      setProvisioning(false);
    }
  }

  return (
    <section
      data-testid="claim-panel"
      className="rounded-[16px] bg-white p-[24px_26px]"
      style={{ border: "1.5px solid #cfe0f5" }}
    >
      <Eyebrow color="#1a4f9c">
        {isAgent ? "CLAIM A HOMEFAX" : "ADD ONE OF YOUR HOMES"}
      </Eyebrow>
      <SectionHeading className="mt-[10px]">
        {isAgent
          ? "Look up an address to claim stewardship"
          : "Look up your address to verify ownership"}
      </SectionHeading>
      <p className="mt-[10px] mb-0 max-w-[640px] text-[14px] leading-[1.6] text-muted">
        {isAgent
          ? "Parcels are provisioned in advance from public county data. Claiming grants you authorization over a record that already exists — it never creates one."
          : "Your home's record already exists. Verifying ownership lets you approve what enters it and request work from verified contractors."}
      </p>

      <form
        className="mt-[18px] flex flex-wrap gap-[10px]"
        onSubmit={(event) => {
          event.preventDefault();
          void lookup();
        }}
      >
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="123 Main Street, Denver, 80206"
          data-testid="claim-lookup-input"
          aria-label="Property address"
          className="min-w-[220px] flex-1 rounded-[10px] border border-input bg-white px-4 py-[13px] text-[15px] text-ink placeholder:text-faint"
        />
        <Button type="submit" disabled={busy} testId="claim-lookup-submit">
          {busy ? "Looking up…" : "Look up"}
        </Button>
      </form>

      <div className="mt-[16px]">
        {result === null ? (
          <p className="m-0 text-[13.5px] text-faint">
            Nothing looked up yet.
          </p>
        ) : result.kind === "found" ? (
          <div
            data-testid="claim-lookup-result"
            data-kind="found"
            className="flex flex-wrap items-center gap-[16px] rounded-[12px] bg-card p-[16px_18px]"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15.5px] font-bold text-ink">
                {result.property.address}
              </div>
              <div className="mt-[3px] truncate text-[13px] text-muted">
                {result.property.city}, {result.property.state}{" "}
                {result.property.postalCode} ·{" "}
                <Mono className="text-link">{result.property.tokenId}</Mono>
              </div>
            </div>
            <Button
              variant="navy"
              onClick={() =>
                router.push(
                  isAgent
                    ? `/properties/${result.property.tokenId}/claim`
                    : `/properties/${result.property.tokenId}/claim`,
                )
              }
            >
              {isAgent ? "Claim stewardship" : "Verify ownership"}
            </Button>
          </div>
        ) : (
          <div
            data-testid="claim-lookup-result"
            data-kind="missing"
            className="rounded-[12px] border border-warn-line bg-warn-panel p-[18px_20px]"
          >
            <div className="text-[14.5px] font-bold text-amber">
              No HomeFax for that address yet
            </div>
            <p className="mt-[8px] mb-0 max-w-[620px] text-[13.5px] leading-[1.6] text-body">
              That parcel sits outside the markets provisioned so far. Pulling it
              from county records creates the record with two county events and
              every system marked unknown — which is the honest starting state,
              and gives it low Home Health confidence until someone contributes.
            </p>
            {isAgent ? (
              <div className="mt-[16px] flex items-center gap-3">
                <Button
                  onClick={() => void provision()}
                  disabled={provisioning}
                  testId="provision-button"
                >
                  {provisioning ? "Provisioning…" : "Provision from county records"}
                </Button>
                {provisioning ? <Spinner /> : null}
              </div>
            ) : (
              <p className="mt-[12px] mb-0 text-[13px] text-muted">
                Ask your agent to provision this parcel, or check the address.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
