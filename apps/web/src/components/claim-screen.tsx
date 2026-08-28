"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Claim,
  ClaimResult,
  HomeClaim,
  PropertyDetail,
  ProofDocument,
  Role,
  SeededRecordStats,
} from "@homefax/contracts";
import { Button, ButtonLink } from "./buttons";
import { Checkbox, ErrorBanner, SelectField, TextField } from "./fields";
import { useToast } from "./feedback";
import { Eyebrow, Mono } from "./ui";
import { ClientApiError, request } from "@/lib/client";
import { formatDate } from "@/lib/format";

type AgentMethod = "mls" | "seller" | "title";
type OwnerMethod = "record" | "proof";

const AGENT_METHODS: {
  id: AgentMethod;
  title: string;
  badge: string;
  body: string;
}[] = [
  {
    id: "mls",
    title: "MLS listing of record",
    badge: "AUTO-VERIFIED",
    body: "The MLS already proved the agency relationship, so this grants immediately. Only the listing agent of record can claim this way. 90-day expiry.",
  },
  {
    id: "seller",
    title: "Seller authorization",
    badge: "OWNER CONSENT",
    body: "For pre-listing, FSBO conversion and pocket listings. The owner of record is asked to grant stewardship, so the claim lands pending until they respond.",
  },
  {
    id: "title",
    title: "Title & escrow at closing",
    badge: "30-DAY CLAIM",
    body: "At transfer, stewardship moves to the buyer's side. Shorter window, because it exists to hand a populated record to the new owner.",
  },
];

const OWNER_METHODS: {
  id: OwnerMethod;
  title: string;
  badge: string;
  body: string;
}[] = [
  {
    id: "record",
    title: "Match to the owner of record",
    badge: "AUTO-VERIFIED",
    body: "Your account name is compared against the county deed. A match grants immediately; anything else routes you to the proof path.",
  },
  {
    id: "proof",
    title: "Upload proof of ownership",
    badge: "RECORDER REVIEW",
    body: "For a name that does not match the deed — a trust, a recent purchase, or a married name. Lands pending until the recorder match completes.",
  },
];

const PROOF_DOCUMENTS: ProofDocument[] = [
  "County tax notice",
  "Recorded deed",
  "Utility bill",
];

export function ClaimScreen({
  property,
  role,
  userName,
  claim,
  homeClaim,
  claimStateKey,
  seededStats,
}: {
  property: PropertyDetail;
  role: Role;
  userName: string;
  claim: Claim | null;
  homeClaim: HomeClaim | null;
  claimStateKey: string;
  seededStats: SeededRecordStats;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isOwner = role === "homeowner";

  const [method, setMethod] = useState<string>(isOwner ? "record" : "mls");
  const [mlsNumber, setMlsNumber] = useState("");
  const [escrowNumber, setEscrowNumber] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [proofDocument, setProofDocument] = useState<ProofDocument>("Recorded deed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const existing = isOwner ? homeClaim : claim;
  const [result, setResult] = useState<ClaimResult | null>(
    existing && (existing.status === "active" || existing.status === "pending")
      ? {
          status: existing.status,
          method: existing.method,
          claimedAt:
            ("claimedAt" in existing ? existing.claimedAt : null) ??
            ("verifiedAt" in existing ? existing.verifiedAt : null) ??
            ("requestedAt" in existing ? existing.requestedAt : null) ??
            "",
          expiresAt: "expiresAt" in existing ? existing.expiresAt : null,
          reference: "mlsNumber" in existing ? existing.mlsNumber : null,
        }
      : null,
  );

  const methods = isOwner ? OWNER_METHODS : AGENT_METHODS;

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const body = isOwner
        ? method === "record"
          ? { method: "record" }
          : { method: "proof", proofDocument }
        : method === "mls"
          ? { method: "mls", mlsNumber }
          : method === "title"
            ? { method: "title", escrowNumber }
            : { method: "seller", acknowledged };

      const response = await request<{ result: ClaimResult }>(
        `/properties/${property.tokenId}/${isOwner ? "verify-ownership" : "claim"}`,
        { method: "POST", body },
      );
      setResult(response.result);
      toast(
        response.result.status === "active"
          ? isOwner
            ? "Ownership verified against the county record."
            : `Stewardship claimed. Expires ${response.result.expiresAt ? formatDate(response.result.expiresAt) : "—"}.`
          : isOwner
            ? "Proof submitted. Recorder match under review."
            : "Consent request sent to the owner of record.",
      );
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ClientApiError
          ? caught.error.message
          : "That claim could not be submitted.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="track-min-0 grid items-start gap-[22px] lg:grid-cols-[minmax(0,1.7fr)_minmax(270px,0.8fr)]">
      <div className="min-w-0">
        <Eyebrow color="#1a4f9c">
          {isOwner ? "VERIFY OWNERSHIP" : "CLAIM STEWARDSHIP"}
        </Eyebrow>
        <h1 className="mt-[12px] mb-0 text-[30px] font-extrabold tracking-[-0.03em] text-ink">
          {property.address}
        </h1>
        <p className="mt-[12px] mb-0 max-w-[620px] text-[14.5px] leading-[1.6] text-muted">
          {isOwner
            ? "This record already exists and already has history. Verifying ownership gives you the right to approve what enters it — it does not create it, and it does not change anything already recorded."
            : "This HomeFax was provisioned from public county data before anyone asked for it. Claiming grants you authorization over a record that already exists. It never gives you edit rights over what is already there."}
        </p>

        <div
          data-testid="seeded-stats"
          className="track-min-0 mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-[14px] rounded-[14px] border border-line bg-white p-[18px_20px]"
        >
          {[
            ["SEEDED EVENTS", seededStats.events],
            ["DOCUMENTS", seededStats.documents],
            ["OWNERSHIP PERIODS", seededStats.ownershipPeriods],
            ["HOME HEALTH", `${seededStats.healthScore} /100`],
          ].map(([label, value]) => (
            <div key={String(label)} className="min-w-0">
              <div className="text-[10.5px] font-bold tracking-[0.12em] text-softer">
                {label}
              </div>
              <div className="mt-[5px] text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                {value}
              </div>
            </div>
          ))}
        </div>

        {result ? (
          <section
            data-testid="claim-result"
            data-status={result.status}
            className="animate-fade-up mt-[22px] rounded-[16px] p-[28px_30px]"
            style={{
              background: result.status === "active" ? "#eef7f1" : "#fffaf1",
              border: `1px solid ${result.status === "active" ? "#cfe6d9" : "#f2dcb4"}`,
            }}
          >
            <div
              className="flex h-[44px] w-[44px] items-center justify-center rounded-full text-[20px] font-bold text-white"
              style={{
                background: result.status === "active" ? "#12693b" : "#c98a12",
              }}
              aria-hidden="true"
            >
              {result.status === "active" ? "✓" : "⋯"}
            </div>
            <h2 className="mt-[18px] mb-0 text-[21px] font-extrabold tracking-[-0.02em] text-ink">
              {result.status === "active"
                ? isOwner
                  ? "Ownership verified"
                  : "Stewardship granted"
                : isOwner
                  ? "Proof submitted for recorder review"
                  : "Consent request sent"}
            </h2>
            <p className="mt-[10px] mb-0 max-w-[560px] text-[14px] leading-[1.6] text-body">
              {result.status === "active"
                ? "You can now add records, ask grounded questions and export this HomeFax. Everything already on the record is unchanged."
                : "Until this completes you can read the county-seeded record, but not contribute to it."}
            </p>

            <dl className="mt-[20px] mb-0 space-y-[9px]">
              {[
                ["Method", result.method],
                ["Granted", result.claimedAt ? formatDate(result.claimedAt) : "—"],
                [
                  "Expires",
                  result.expiresAt ? formatDate(result.expiresAt) : "Does not expire",
                ],
                ["Reference", result.reference ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-[13.5px]">
                  <dt className="text-muted">{label}</dt>
                  <dd className="m-0 font-bold text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-[24px] flex flex-wrap gap-[10px]">
              <ButtonLink href={`/properties/${property.tokenId}`}>
                Open the property record
              </ButtonLink>
              <ButtonLink
                href={isOwner ? "/dashboard" : "/properties"}
                variant="outline"
              >
                {isOwner ? "Back to my homes" : "Back to properties"}
              </ButtonLink>
            </div>
          </section>
        ) : (
          <form
            className="mt-[22px] space-y-[12px]"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {error ? <ErrorBanner testId="claim-error">{error}</ErrorBanner> : null}

            {methods.map((option) => {
              const selected = method === option.id;
              return (
                <label
                  key={option.id}
                  data-testid="claim-method"
                  data-method={option.id}
                  data-selected={selected}
                  className="block cursor-pointer rounded-[14px] p-[20px_22px]"
                  style={{
                    border: selected ? "1.5px solid #0b2c52" : "1px solid #e3e7ec",
                    background: selected ? "#f8fafb" : "#ffffff",
                  }}
                >
                  <div className="flex items-start gap-[12px]">
                    <input
                      type="radio"
                      name="claim-method"
                      checked={selected}
                      onChange={() => {
                        setMethod(option.id);
                        setError("");
                      }}
                      className="mt-[3px] h-[16px] w-[16px] shrink-0 cursor-pointer"
                      style={{ accentColor: "#0b2c52" }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-[10px]">
                        <span className="text-[16px] font-bold text-ink">
                          {option.title}
                        </span>
                        <span className="rounded-[5px] bg-info-bg px-[8px] py-[3px] text-[10px] font-bold tracking-[0.08em] text-link">
                          {option.badge}
                        </span>
                      </div>
                      <p className="mt-[8px] mb-0 text-[13.5px] leading-[1.6] text-muted">
                        {option.body}
                      </p>

                      {selected && option.id === "mls" ? (
                        <div className="mt-[16px] grid gap-[12px] sm:grid-cols-2">
                          <TextField
                            testId="claim-mls-number"
                            label="MLS number"
                            value={mlsNumber}
                            onChange={(e) => setMlsNumber(e.target.value)}
                            placeholder="9182446"
                          />
                          <TextField
                            label="Listing agent ID"
                            value="REMAX-CO-4471"
                            disabled
                            hint="From your signed-in account."
                          />
                        </div>
                      ) : null}

                      {selected && option.id === "title" ? (
                        <TextField
                          testId="claim-escrow-number"
                          className="mt-[16px] max-w-[300px]"
                          label="Escrow or file number"
                          value={escrowNumber}
                          onChange={(e) => setEscrowNumber(e.target.value)}
                          placeholder="ESC-2026-4471"
                        />
                      ) : null}

                      {selected && option.id === "seller" ? (
                        <Checkbox
                          testId="claim-acknowledge"
                          className="mt-[16px]"
                          checked={acknowledged}
                          onChange={setAcknowledged}
                          label="I have the owner's permission to request stewardship of this HomeFax."
                        />
                      ) : null}

                      {selected && option.id === "record" ? (
                        <p className="mt-[14px] mb-0 rounded-[10px] bg-white p-[12px_14px] text-[13px] leading-[1.55] text-body">
                          Comparing <strong>{userName}</strong> against the county
                          deed for parcel <Mono>{property.parcelId}</Mono>.
                        </p>
                      ) : null}

                      {selected && option.id === "proof" ? (
                        <SelectField
                          testId="claim-proof-document"
                          className="mt-[16px] max-w-[300px]"
                          label="Document you are submitting"
                          value={proofDocument}
                          onChange={(e) =>
                            setProofDocument(e.target.value as ProofDocument)
                          }
                          options={PROOF_DOCUMENTS.map((value) => ({
                            value,
                            label: value,
                          }))}
                        />
                      ) : null}
                    </div>
                  </div>
                </label>
              );
            })}

            <div className="pt-[8px]">
              <Button type="submit" size="lg" disabled={busy} testId="claim-submit">
                {busy
                  ? "Submitting…"
                  : isOwner
                    ? "Verify ownership"
                    : "Claim stewardship"}
              </Button>
            </div>
          </form>
        )}
      </div>

      <aside className="min-w-0 space-y-[18px]">
        <div className="dot-grid rounded-[16px] p-[24px_26px] text-white">
          <h3 className="m-0 text-[16px] font-extrabold tracking-[-0.015em]">
            Agents don&apos;t create HomeFaxes
          </h3>
          <p className="mt-[10px] mb-0 text-[13.5px] leading-[1.6]" style={{ color: "#ffffffcc" }}>
            Assessor and recorder files are public and bulk-available, so a
            HomeFax is provisioned for every parcel in a market before anyone asks
            for one. Claiming is authorization over a record that already exists —
            which is why coverage is a data problem, not a sales problem.
          </p>
        </div>

        <div className="rounded-[16px] border border-line bg-white p-[22px_24px]">
          <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
            What {isOwner ? "verification" : "stewardship"} grants
          </h3>
          <ul className="mt-[14px] mb-0 list-none space-y-[10px] p-0">
            {(isOwner
              ? [
                  "Approve or decline contractor submissions",
                  "Add records to your own home",
                  "Ask grounded questions about the record",
                  "Request work from verified contractors",
                ]
              : [
                  "Add records and approve extractions",
                  "Ask grounded questions about the record",
                  "Export a buyer-ready report",
                  "Transfer the record to the homeowner at close",
                ]
            ).map((item) => (
              <li key={item} className="flex gap-[10px] text-[13.5px] leading-[1.5] text-body">
                <span className="font-bold text-green">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-[14px] mb-0 border-t border-line-light pt-[12px] text-[12.5px] leading-[1.55] text-faint">
            It never grants edit rights over events already on the record.
          </p>
        </div>

        {isOwner ? null : (
          <div className="rounded-[16px] border border-line bg-white p-[22px_24px]">
            <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
              Why claims expire
            </h3>
            <p className="mt-[10px] mb-0 text-[13px] leading-[1.6] text-muted">
              Stewardship is time-boxed and non-exclusive. A claim ends when the
              listing does and never locks another agent out of the parcel —
              otherwise the first brokerage to claim a market would hold its records
              hostage.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
