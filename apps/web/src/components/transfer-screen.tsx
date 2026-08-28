"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TransferResult } from "@homefax/contracts";
import { Button, ButtonLink } from "./buttons";
import { Checkbox, ErrorBanner, TextField } from "./fields";
import { useToast } from "./feedback";
import { Mono } from "./ui";
import { ClientApiError, request } from "@/lib/client";

export function TransferScreen({
  tokenId,
  address,
  stewardName,
  eventCount,
}: {
  tokenId: string;
  address: string;
  stewardName: string;
  eventCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [transferDate, setTransferDate] = useState("2026-08-28");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TransferResult | null>(null);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const response = await request<{ result: TransferResult }>(
        `/properties/${tokenId}/transfers`,
        {
          method: "POST",
          body: { newOwnerName, newOwnerEmail, transferDate, acknowledged },
        },
      );
      setResult(response.result);
      toast("Stewardship transferred. Ledger re-verified.");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ClientApiError
          ? caught.error.message
          : "That transfer could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div
        data-testid="transfer-result"
        className="animate-fade-up mx-auto max-w-[620px] rounded-[16px] border border-ok-line bg-[#eef7f1] p-[36px_38px]"
      >
        <div
          className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-green text-[22px] font-bold text-white"
          aria-hidden="true"
        >
          ✓
        </div>
        <h1 className="mt-[20px] mb-0 text-[26px] font-extrabold tracking-[-0.03em] text-ink">
          Transferred to the homeowner
        </h1>
        <p className="mt-[12px] mb-0 text-[14.5px] leading-[1.6] text-body">
          {result.newOwnerName} now approves what enters this record. The property
          history is retained in full.
        </p>

        <dl className="mt-[22px] mb-0 space-y-[9px]">
          {[
            ["Property", address],
            ["HomeFax", tokenId],
            ["Events retained", String(result.retainedEventCount)],
            ["New ownership period", `#${result.ownershipPeriodNumber}`],
            [
              "Ledger",
              result.ledger.valid
                ? `Verified · ${result.ledger.checkedEvents} events checked`
                : "Integrity warning",
            ],
            ["Homeowner invited", result.newOwnerEmail],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 text-[13.5px]">
              <dt className="shrink-0 text-muted">{label}</dt>
              <dd className="m-0 truncate text-right font-bold text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-[20px] mb-0 rounded-[10px] bg-white p-[14px_16px] text-[12.5px] leading-[1.6] text-muted">
          This transferred administration of the digital property record. Legal
          ownership remains governed by the deed and title process; no deed was
          recorded.
        </p>

        <div className="mt-[24px] flex flex-wrap gap-[10px]">
          <ButtonLink href={`/properties/${tokenId}/timeline`}>
            View timeline
          </ButtonLink>
          <ButtonLink href={`/properties/${tokenId}`} variant="outline">
            Back to overview
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="track-min-0 grid items-start gap-[22px] lg:grid-cols-[minmax(0,1.6fr)_minmax(270px,0.85fr)]">
      <div className="min-w-0">
        <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.03em] text-ink">
          Transfer HomeFax stewardship
        </h1>
        <p className="mt-[10px] mb-[22px] max-w-[560px] text-[14.5px] leading-[1.6] text-muted">
          The HomeFax history remains attached to the property. This transfers
          administration of the digital record; legal ownership remains governed by
          the deed and title process.
        </p>

        <form
          className="space-y-[16px] rounded-[16px] border border-line bg-white p-[26px_28px]"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {error ? <ErrorBanner>{error}</ErrorBanner> : null}

          <TextField label="Current steward" value={stewardName} disabled />
          <TextField
            testId="transfer-name"
            label="New owner name"
            value={newOwnerName}
            onChange={(e) => setNewOwnerName(e.target.value)}
            placeholder="Dana Whitfield"
          />
          <TextField
            testId="transfer-email"
            label="New owner email"
            type="email"
            value={newOwnerEmail}
            onChange={(e) => setNewOwnerEmail(e.target.value)}
            placeholder="owner@homefax.demo"
            hint="They are invited to claim the record at this address."
          />
          <TextField
            testId="transfer-date"
            label="Transfer date"
            type="date"
            value={transferDate}
            onChange={(e) => setTransferDate(e.target.value)}
          />

          <Checkbox
            testId="transfer-acknowledge"
            checked={acknowledged}
            onChange={setAcknowledged}
            label="I understand this is a simulated transfer of the digital property record. It is not a legal title transfer and no deed is recorded."
          />

          <Button type="submit" size="lg" disabled={busy} testId="transfer-submit">
            {busy ? "Transferring…" : "Transfer stewardship"}
          </Button>
        </form>
      </div>

      <aside className="min-w-0 space-y-[18px]">
        <div className="rounded-[16px] border border-line bg-white p-[22px_24px]">
          <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
            What survives the transfer
          </h3>
          <ul className="mt-[14px] mb-0 list-none space-y-[10px] p-0">
            {[
              `All ${eventCount} events, unchanged`,
              "Every document and its SHA-256",
              "The full hash chain, re-verified after the append",
              "Anonymized ownership periods, with a new one opened",
            ].map((item) => (
              <li key={item} className="flex gap-[10px] text-[13.5px] leading-[1.5] text-body">
                <span className="font-bold text-green">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[16px] border border-line bg-card p-[22px_24px]">
          <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
            The record, not the deed
          </h3>
          <p className="mt-[10px] mb-0 text-[13px] leading-[1.6] text-muted">
            What moves is who approves what enters the record. Nothing here creates,
            records or implies a change of legal ownership.
          </p>
          <Mono className="mt-[12px] block text-[11px] text-faint">{tokenId}</Mono>
        </div>
      </aside>
    </div>
  );
}
