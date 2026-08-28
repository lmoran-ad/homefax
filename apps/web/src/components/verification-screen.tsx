"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Contractor, VerificationChecklistItem } from "@hometoken/contracts";
import { Button } from "./buttons";
import { ErrorBanner, TextField } from "./fields";
import { useToast } from "./feedback";
import { Pill } from "./ui";
import { ClientApiError, request } from "@/lib/client";

const STATUS_CHIP: Record<
  VerificationChecklistItem["status"],
  { bg: string; fg: string }
> = {
  complete: { bg: "#e7f4ec", fg: "#12693b" },
  pending: { bg: "#fdf3e2", fg: "#8a5a06" },
  missing: { bg: "#fdecee", fg: "#a8102a" },
};

export function VerificationScreen({
  contractor,
  checklist,
}: {
  contractor: Contractor;
  checklist: VerificationChecklistItem[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: contractor.name,
    trade: contractor.trade,
    license: contractor.license,
    zips: contractor.zips,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof typeof form, value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  async function save() {
    setBusy(true);
    setError("");
    try {
      const result = await request<{ contractor: Contractor }>("/verification", {
        method: "PATCH",
        body: form,
      });
      toast(
        result.contractor.verified
          ? "Profile saved. License verified with the state board."
          : "Profile saved. That license is not on file, so submissions will record as Owner Reported.",
      );
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ClientApiError
          ? caught.error.message
          : "Your profile could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="track-min-0 grid items-start gap-[22px] lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.9fr)]">
      <div className="min-w-0 space-y-[22px]">
        <section className="rounded-[16px] border border-line bg-white p-[26px_28px]">
          <div className="flex flex-wrap items-center gap-[14px]">
            <div
              className="flex h-[48px] w-[48px] items-center justify-center rounded-[12px] bg-card text-[16px] font-bold text-navy"
              aria-hidden="true"
            >
              {contractor.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-[10px]">
                <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.02em] text-ink">
                  {contractor.name}
                </h2>
                <Pill
                  label={contractor.verified ? "VERIFIED SOURCE" : "UNVERIFIED"}
                  bg={contractor.verified ? "#e7f4ec" : "#eef1f4"}
                  fg={contractor.verified ? "#12693b" : "#6b7580"}
                />
              </div>
              <div className="mt-[4px] text-[13px] text-muted">
                {contractor.since}
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-[18px]">
              <ErrorBanner>{error}</ErrorBanner>
            </div>
          ) : null}

          <div className="mt-[22px] grid gap-[16px] sm:grid-cols-2">
            <TextField
              label="Company name"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
            />
            <TextField
              label="Trade"
              value={form.trade}
              onChange={(event) => set("trade", event.target.value)}
            />
            <TextField
              label="License number"
              value={form.license}
              onChange={(event) => set("license", event.target.value)}
              hint="Re-checked against the state board whenever you save."
            />
            <TextField
              label="Service ZIPs"
              value={form.zips}
              onChange={(event) => set("zips", event.target.value)}
            />
          </div>

          <div className="mt-[22px]">
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </section>

        <section className="rounded-[16px] border border-line bg-white p-[26px_28px]">
          <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Verification checklist
          </h2>
          <div className="mt-[18px] space-y-[12px]">
            {checklist.map((item) => {
              const chip = STATUS_CHIP[item.status];
              return (
                <div
                  key={item.label}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-[12px] bg-card p-[16px_18px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-bold text-ink">
                      {item.label}
                    </div>
                    <div className="mt-[4px] text-[13px] leading-[1.5] text-muted">
                      {item.detail}
                    </div>
                  </div>
                  <Pill label={item.statusLabel} bg={chip.bg} fg={chip.fg} />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="min-w-0 space-y-[18px]">
        <div className="dot-grid rounded-[16px] p-[24px_26px] text-white">
          <div className="text-[11px] font-bold tracking-[0.16em]" style={{ color: "#ffffff8a" }}>
            SUBSCRIPTION
          </div>
          <div className="mt-[12px] text-[30px] font-extrabold tracking-[-0.03em]">
            $25 <span className="text-[15px] font-semibold">/ month</span>
          </div>
          <p className="mt-[10px] mb-0 text-[13.5px] leading-[1.6]" style={{ color: "#ffffffcc" }}>
            Per verified license. Keeps you listed in Find a Pro and eligible for
            system-triggered leads.
          </p>
          <a
            href="/plans"
            className="mt-[18px] inline-flex items-center justify-center rounded-[9px] bg-white px-[16px] py-[10px] text-[13.5px] font-bold text-navy no-underline hover:text-navy"
          >
            Manage subscription
          </a>
        </div>

        <div className="rounded-[16px] border border-line bg-white p-[22px_24px]">
          <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
            Why homeowners accept your records
          </h3>
          <p className="mt-[10px] mb-0 text-[13px] leading-[1.6] text-muted">
            Because a submission is a proposal, not an edit. The owner can accept it
            or decline it, but cannot alter what you sent — so what lands on the
            record is what you actually submitted.
          </p>
          <p className="mt-[10px] mb-0 text-[13px] leading-[1.6] text-muted">
            Your name and license stay attached to the work for the next owner to
            see.
          </p>
        </div>
      </aside>
    </div>
  );
}
