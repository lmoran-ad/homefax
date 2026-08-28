"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Contractor, Role } from "@homefax/contracts";
import { Button } from "./buttons";
import { Checkbox, FilterPills, TextArea } from "./fields";
import { Modal, useToast } from "./feedback";
import { EmptyState, Mono, Pill } from "./ui";
import { ClientApiError, request } from "@/lib/client";

export function FindAPro({
  contractors,
  trades,
  role,
  initial,
}: {
  contractors: Contractor[];
  trades: { trade: string; count: number }[];
  role: Role;
  initial: { q: string; trade: string; verifiedOnly: boolean };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [q, setQ] = useState(initial.q);
  const [verifiedOnly, setVerifiedOnly] = useState(initial.verifiedOnly);
  const [requesting, setRequesting] = useState<Contractor | null>(null);
  const [need, setNeed] = useState("");
  const [share, setShare] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function apply(next: Partial<{ q: string; trade: string; verifiedOnly: boolean }>) {
    const params = new URLSearchParams({
      q: next.q ?? q,
      trade: next.trade ?? initial.trade,
      verifiedOnly: String(next.verifiedOnly ?? verifiedOnly),
    });
    router.push(`/pros?${params.toString()}`);
  }

  async function sendRequest() {
    if (!requesting) return;
    setBusy(true);
    setError("");
    try {
      await request("/jobs/requests", {
        method: "POST",
        body: {
          contractorId: requesting.id,
          trade: requesting.trade,
          description: need,
          shareSystemRecord: share,
        },
      });
      toast(`Request sent to ${requesting.name}.`);
      setRequesting(null);
      setNeed("");
      router.push("/inbox");
    } catch (caught) {
      setError(
        caught instanceof ClientApiError
          ? caught.error.message
          : "That request could not be sent.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="rounded-[16px] border border-line bg-white p-[22px]">
        <form
          className="flex flex-wrap items-center gap-[10px]"
          onSubmit={(event) => {
            event.preventDefault();
            apply({ q });
          }}
        >
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Trade, company or license number"
            data-testid="pro-search-input"
          aria-label="Search contractors"
            className="min-w-[220px] flex-1 rounded-[10px] border border-input bg-white px-4 py-[13px] text-[15px] text-ink placeholder:text-faint"
          />
          <Button type="submit" variant="navy" testId="pro-search-submit">
            Search
          </Button>
          <Checkbox
            testId="pro-verified-only"
            label="Verified only"
            checked={verifiedOnly}
            onChange={(next) => {
              setVerifiedOnly(next);
              apply({ verifiedOnly: next });
            }}
          />
        </form>
      </div>

      <div className="mt-[18px]">
        <FilterPills
          testId="pro-trade-filter"
          value={initial.trade}
          onChange={(trade) => apply({ trade })}
          options={trades.map((entry) => ({
            value: entry.trade,
            label: entry.trade,
            count: entry.count,
          }))}
        />
      </div>

      {contractors.length === 0 ? (
        <div className="mt-[22px]">
          <EmptyState
            title="No contractors match that search"
            body="Try a trade such as HVAC or Roofing, or clear the verified-only filter."
          />
        </div>
      ) : (
        <div className="track-min-0 mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          {contractors.map((contractor) => (
            <article
              key={contractor.id}
              data-testid="contractor-card"
              data-contractor-id={contractor.id}
              data-verified={contractor.verified}
              className="flex min-w-0 flex-col rounded-[14px] bg-white p-[20px_22px]"
              style={{
                border: contractor.verified
                  ? "1px solid #e3e7ec"
                  : "1px solid #f0dcb8",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className="flex h-[44px] w-[44px] items-center justify-center rounded-[11px] bg-card text-[15px] font-bold text-navy"
                  aria-hidden="true"
                >
                  {contractor.initials}
                </div>
                <Pill
                  testId="contractor-verification"
                  label={contractor.verified ? "VERIFIED SOURCE" : "UNVERIFIED"}
                  bg={contractor.verified ? "#e7f4ec" : "#eef1f4"}
                  fg={contractor.verified ? "#12693b" : "#6b7580"}
                />
              </div>

              <h3
                data-testid="contractor-name"
                className="mt-[14px] mb-0 text-[17.5px] font-extrabold tracking-[-0.02em] text-ink"
              >
                {contractor.name}
              </h3>
              <div className="mt-[3px] text-[13.5px] text-muted">
                {contractor.trade}
              </div>

              <dl className="mt-[14px] mb-0 space-y-[7px]">
                {[
                  ["License", contractor.license],
                  ["Jobs on HomeFax", String(contractor.jobCount)],
                  ["Service area", contractor.area],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 text-[13px]">
                    <dt className="shrink-0 text-muted">{label}</dt>
                    <dd
                      className="m-0 truncate text-right font-semibold"
                      style={{
                        color:
                          label === "License" && !contractor.verified
                            ? "#a8102a"
                            : "#12222f",
                      }}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="flex-1" />

              <div className="mt-[18px] flex flex-wrap gap-[8px]">
                <Link
                  href={`/pros/${contractor.id}`}
                  data-testid="view-record-link"
                  className="rounded-[8px] border border-input bg-white px-[13px] py-[8px] text-[13px] font-bold text-ink no-underline hover:border-navy hover:text-navy"
                >
                  View record
                </Link>
                {role === "homeowner" ? (
                  <Button
                    size="sm"
                    onClick={() => setRequesting(contractor)}
                    testId="request-work-button"
                  >
                    Request work
                  </Button>
                ) : (
                  <span
                    className="cursor-not-allowed rounded-[8px] border border-line bg-card px-[13px] py-[8px] text-[13px] font-bold text-faint"
                    title="Only a homeowner can request work at their property"
                  >
                    Homeowner only
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(requesting)}
        onClose={() => setRequesting(null)}
        maxWidth={520}
        labelledBy="request-title"
      >
        {requesting ? (
          <div data-testid="request-modal" className="p-[26px_28px]">
            <h2
              id="request-title"
              className="m-0 text-[21px] font-extrabold tracking-[-0.02em] text-ink"
            >
              Request work from {requesting.name}
            </h2>
            <div className="mt-[6px] text-[13.5px] text-muted">
              {requesting.trade} · <Mono>{requesting.license}</Mono>
            </div>

            {error ? (
              <div className="mt-[16px] rounded-[10px] border border-danger-line bg-danger-bg p-3 text-[13px] text-error">
                {error}
              </div>
            ) : null}

            <TextArea
              testId="request-need"
              className="mt-[18px]"
              label="What do you need?"
              value={need}
              onChange={(event) => setNeed(event.target.value)}
              placeholder="The condenser is short cycling in the heat and the last service noted the compressor is aging."
            />

            <Checkbox
              testId="request-share"
              className="mt-[16px]"
              checked={share}
              onChange={setShare}
              label="Share this system's record so they can quote from the real service history."
            />

            <div className="mt-[22px] flex flex-wrap gap-[10px]">
              <Button
                onClick={() => void sendRequest()}
                disabled={busy}
                testId="request-send"
              >
                {busy ? "Sending…" : "Send request"}
              </Button>
              <Button variant="outline" onClick={() => setRequesting(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
