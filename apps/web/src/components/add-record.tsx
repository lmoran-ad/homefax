"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  DemoDocument,
  ExtractionResponse,
  VerificationLevel,
  Visibility,
} from "@hometoken/contracts";
import { AUTHORABLE_EVENT_TYPES } from "@hometoken/contracts";
import { Button } from "./buttons";
import { ErrorBanner, SelectField, TextArea, TextField } from "./fields";
import { useToast } from "./feedback";
import { Mono, Spinner } from "./ui";
import { ClientApiError, request } from "@/lib/client";

type Stage = "choose" | "extracting" | "review";

type Form = {
  title: string;
  eventType: string;
  occurredAt: string;
  contractor: string;
  amount: string;
  systemType: string;
  permitNumber: string;
  description: string;
  verificationLevel: VerificationLevel;
  visibility: Visibility;
};

const VERIFICATION_OPTIONS: { value: VerificationLevel; label: string }[] = [
  { value: "OWNER_REPORTED", label: "Owner Reported" },
  { value: "PROFESSIONAL_VERIFIED", label: "Professional Verified" },
  { value: "SOURCE_VERIFIED", label: "Source Verified" },
  { value: "UNVERIFIED", label: "Unverified" },
];

export function AddRecord({
  tokenId,
  address,
  demoDocuments,
}: {
  tokenId: string;
  address: string;
  demoDocuments: DemoDocument[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>("choose");
  const [fileName, setFileName] = useState("");
  const [extraction, setExtraction] = useState<ExtractionResponse | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((previous) => (previous ? { ...previous, [key]: value } : previous));

  function formFrom(response: ExtractionResponse): Form {
    const proposal = response.proposal;
    return {
      title: proposal.title || "Untitled record",
      eventType: proposal.suggestedEventType,
      occurredAt: proposal.occurredAt ?? "2026-08-28",
      contractor: proposal.contractor ?? "",
      amount: proposal.amount === null ? "" : String(proposal.amount),
      systemType: proposal.systemType ?? proposal.category ?? "",
      permitNumber: proposal.permitNumber ?? "",
      description: proposal.description,
      // Never pre-selects a verified level. The person approving picks it,
      // which is the whole point of the review step.
      verificationLevel: "OWNER_REPORTED",
      visibility: "AUTHENTICATED",
    };
  }

  async function extract(body: Record<string, unknown>, name: string) {
    setStage("extracting");
    setFileName(name);
    setError("");
    try {
      const response = await request<ExtractionResponse>(
        `/properties/${tokenId}/extractions`,
        { method: "POST", body },
      );
      setExtraction(response);
      setForm(formFrom(response));
      setStage("review");
    } catch (caught) {
      setError(
        caught instanceof ClientApiError
          ? caught.error.message
          : "That document could not be read.",
      );
      setStage("choose");
    }
  }

  async function approve() {
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      const { eventId } = await request<{ eventId: string }>(
        `/properties/${tokenId}/events`,
        {
          method: "POST",
          body: {
            title: form.title,
            eventType: form.eventType,
            occurredAt: form.occurredAt,
            description: form.description,
            contractor: form.contractor || null,
            amount: form.amount ? Number(form.amount.replace(/[^0-9.]/g, "")) : null,
            permitNumber: form.permitNumber || null,
            systemType: form.systemType || null,
            verificationLevel: form.verificationLevel,
            visibility: form.visibility,
            materials: [],
            documentId: extraction?.documentId ?? null,
          },
        },
      );
      toast("Record added. Ledger re-verified.");
      router.push(`/properties/${tokenId}/timeline?new=${eventId}#ev-${eventId}`);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ClientApiError
          ? caught.error.message
          : "That record could not be added.",
      );
      setSaving(false);
    }
  }

  return (
    <div className="track-min-0 grid items-start gap-[22px] lg:grid-cols-[minmax(0,1.7fr)_minmax(270px,0.8fr)]">
      <div className="min-w-0">
        <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.03em] text-ink">
          Add a record
        </h1>
        <p className="mt-[8px] mb-[22px] max-w-[600px] text-[14px] leading-[1.6] text-muted">
          Upload a document and AI proposes an event from it. Nothing reaches the
          record until you confirm the values and choose a verification level.
        </p>

        {error ? (
          <div className="mb-[18px]">
            <ErrorBanner>{error}</ErrorBanner>
          </div>
        ) : null}

        {stage === "choose" ? (
          <section className="rounded-[16px] border border-line bg-white p-[26px_28px]">
            <div className="rounded-[14px] border-2 border-dashed border-[#cfd8e0] p-[38px] text-center">
              <div className="text-[16px] font-bold text-ink">
                Drop an invoice, permit or report
              </div>
              <p className="mx-auto mt-[8px] mb-0 max-w-[380px] text-[13.5px] leading-[1.6] text-muted">
                Text documents up to 5 MB. The file is stored and hashed before
                anything is read from it.
              </p>
              <label className="mt-[18px] inline-flex cursor-pointer items-center justify-center rounded-[9px] border border-input bg-white px-[18px] py-[11px] text-[14px] font-bold text-ink hover:border-navy hover:text-navy">
                Choose a file
                <input
                  type="file"
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    void extract({ fileName: file.name, text }, file.name);
                  }}
                />
              </label>
            </div>

            <div className="my-[26px] flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="text-[11px] font-bold tracking-[0.14em] text-softer">
                OR USE A DEMO DOCUMENT
              </span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <div className="track-min-0 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-[12px]">
              {demoDocuments.map((document) => (
                <button
                  key={document.key}
                  type="button"
                  onClick={() =>
                    void extract({ demoDocumentKey: document.key }, document.name)
                  }
                  className="min-w-0 cursor-pointer rounded-[12px] border border-line bg-white p-[16px_18px] text-left hover:border-navy"
                >
                  <div className="text-[14.5px] font-bold text-ink">
                    {document.title}
                  </div>
                  <div className="mt-[5px] text-[12.5px] text-muted">
                    {document.hint}
                  </div>
                  <Mono className="mt-[8px] block truncate text-[11px] text-faint">
                    {document.name}
                  </Mono>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setExtraction(null);
                setForm({
                  title: "",
                  eventType: "REPAIR",
                  occurredAt: "2026-08-28",
                  contractor: "",
                  amount: "",
                  systemType: "",
                  permitNumber: "",
                  description: "",
                  verificationLevel: "OWNER_REPORTED",
                  visibility: "AUTHENTICATED",
                });
                setStage("review");
              }}
              className="mt-[22px] cursor-pointer border-0 bg-transparent p-0 text-[13.5px] font-bold text-link hover:text-brand"
            >
              Enter a record manually instead →
            </button>
          </section>
        ) : null}

        {stage === "extracting" ? (
          <section className="rounded-[16px] border border-line bg-white p-[46px_28px] text-center">
            <div className="flex justify-center">
              <Spinner size={28} />
            </div>
            <div className="mt-[20px] text-[16px] font-bold text-ink">
              Reading {fileName}
            </div>
            <p className="mx-auto mt-[8px] mb-0 max-w-[380px] text-[13.5px] leading-[1.6] text-muted">
              Extracting a proposed property event. This will require your review.
            </p>
          </section>
        ) : null}

        {stage === "review" && form ? (
          <section className="rounded-[16px] border border-line bg-white p-[26px_28px]">
            {extraction ? (
              <div className="mb-[22px] rounded-[12px] border border-warn-line bg-warn-panel p-[16px_18px]">
                <div className="text-[11px] font-bold tracking-[0.12em] text-amber">
                  AI EXTRACTED — PENDING VERIFICATION
                </div>
                <p className="mt-[8px] mb-0 text-[13.5px] leading-[1.6] text-body">
                  {extraction.manual
                    ? "Extraction was unavailable, so nothing has been filled in for you. Complete the fields from the document yourself."
                    : `The model reported ${extraction.proposal.confidence} confidence. Check every value against the document before approving.`}
                </p>
              </div>
            ) : null}

            <div className="grid gap-[16px] sm:grid-cols-2">
              <TextField
                className="sm:col-span-2"
                label="Title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
              <SelectField
                label="Event type"
                value={form.eventType}
                onChange={(e) => set("eventType", e.target.value)}
                options={AUTHORABLE_EVENT_TYPES.map((value) => ({
                  value,
                  label: value.replace(/_/g, " "),
                }))}
              />
              <TextField
                label="Date"
                type="date"
                value={form.occurredAt}
                onChange={(e) => set("occurredAt", e.target.value)}
              />
              <TextField
                label="Contractor"
                value={form.contractor}
                onChange={(e) => set("contractor", e.target.value)}
                placeholder="Not stated in the document"
              />
              <TextField
                label="Amount"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="Not stated"
              />
              <TextField
                label="System"
                value={form.systemType}
                onChange={(e) => set("systemType", e.target.value)}
                placeholder="HVAC, Roof, Plumbing…"
                hint="Updates the matching system card when set."
              />
              <TextField
                label="Permit number"
                value={form.permitNumber}
                onChange={(e) => set("permitNumber", e.target.value)}
                placeholder="Not stated"
              />
              <TextArea
                className="sm:col-span-2"
                label="Description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
              <SelectField
                label="Verification level"
                value={form.verificationLevel}
                onChange={(e) =>
                  set("verificationLevel", e.target.value as VerificationLevel)
                }
                options={VERIFICATION_OPTIONS}
              />
              <SelectField
                label="Visibility"
                value={form.visibility}
                onChange={(e) => set("visibility", e.target.value as Visibility)}
                options={[
                  { value: "PUBLIC", label: "Public" },
                  { value: "AUTHENTICATED", label: "Authenticated" },
                  { value: "RESTRICTED", label: "Restricted" },
                ]}
              />
            </div>

            {extraction && extraction.proposal.evidence.length > 0 ? (
              <div className="mt-[22px] rounded-[12px] bg-card p-[16px_18px]">
                <div className="text-[10.5px] font-bold tracking-[0.14em] text-softer">
                  EVIDENCE FROM THE DOCUMENT
                </div>
                <ul className="mt-[10px] mb-0 list-none space-y-[7px] p-0">
                  {extraction.proposal.evidence.map((line) => (
                    <li
                      key={line}
                      className="text-[12.5px] leading-[1.55] text-body"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      “{line}”
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-[24px] flex flex-wrap gap-[10px]">
              <Button variant="green" onClick={() => void approve()} disabled={saving}>
                {saving ? "Adding…" : "Approve & Add to HomeToken"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStage("choose");
                  setExtraction(null);
                  setForm(null);
                }}
                disabled={saving}
              >
                Discard
              </Button>
            </div>

            <p className="mt-[16px] mb-0 text-[12.5px] leading-[1.6] text-faint">
              Approving appends a new event and extends the hash chain. Nothing is
              overwritten.
            </p>
          </section>
        ) : null}
      </div>

      <aside className="min-w-0 space-y-[18px]">
        {extraction ? (
          <div className="rounded-[16px] border border-line bg-white p-[22px_24px]">
            <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
              Source document
            </h3>
            <div className="mt-[8px] truncate text-[13px] text-muted">
              {extraction.documentName}
            </div>
            <Mono className="mt-[8px] block text-[10.5px] break-all text-faint">
              sha256 {extraction.sha256}
            </Mono>
            <pre
              className="mt-[14px] max-h-[280px] overflow-auto rounded-[10px] bg-card p-[14px] text-[11.5px] leading-[1.6] whitespace-pre-wrap text-body"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {extraction.preview}
            </pre>
          </div>
        ) : null}

        <div className="rounded-[16px] border border-line bg-card p-[22px_24px]">
          <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
            Why approval is required
          </h3>
          <p className="mt-[10px] mb-0 text-[13px] leading-[1.6] text-muted">
            Extraction is a proposal. An event is never marked verified because a
            model produced it — a person confirms the values and chooses the
            verification level, and that choice is what the record carries.
          </p>
          <p className="mt-[10px] mb-0 text-[13px] leading-[1.6] text-muted">
            AI can read the paperwork. It is not allowed to silently rewrite the
            home&apos;s history.
          </p>
        </div>

        <div className="rounded-[16px] border border-line bg-white p-[22px_24px]">
          <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
            Adding to
          </h3>
          <div className="mt-[8px] text-[14px] font-bold text-ink">{address}</div>
          <Mono className="mt-[4px] block text-[11.5px] text-link">{tokenId}</Mono>
        </div>
      </aside>
    </div>
  );
}
