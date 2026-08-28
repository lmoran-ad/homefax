"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DemoDocument, Job } from "@homefax/contracts";
import { AUTHORABLE_EVENT_TYPES } from "@homefax/contracts";
import { Button } from "./buttons";
import { ErrorBanner, SelectField, TextArea, TextField } from "./fields";
import { useToast } from "./feedback";
import { EmptyState, JobStatusPill, Mono, Spinner } from "./ui";
import { ClientApiError, request } from "@/lib/client";
import { formatDate, formatMoney, JOB_STATUS } from "@/lib/format";

type AddressCheck = { ok: boolean; message: string; tokenId: string | null };

export function JobsWorkspace({
  jobs,
  stats,
  demoDocuments,
}: {
  jobs: Job[];
  stats: { open: number; inProgress: number; awaiting: number; recorded: number };
  demoDocuments: DemoDocument[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [check, setCheck] = useState<AddressCheck | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    occurredAt: "2026-08-28",
    amount: "",
    eventType: "REPAIR",
    systemType: "",
    description: "",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  async function checkAddress(next: string) {
    setAddress(next);
    if (next.trim().length < 4) {
      setCheck(null);
      return;
    }
    try {
      setCheck(
        await request<AddressCheck>(
          `/jobs/address-check?address=${encodeURIComponent(next)}`,
        ),
      );
    } catch {
      setCheck(null);
    }
  }

  function startSubmission(job: Job | null) {
    setOpen(true);
    setJobId(job?.id ?? null);
    setError("");
    setDocumentId(null);
    setDocumentName(null);
    setForm({
      title: job ? `${job.trade} work completed` : "",
      occurredAt: "2026-08-28",
      amount: "",
      eventType: job?.trade === "HVAC" ? "SYSTEM_INSTALLATION" : "REPAIR",
      systemType: job?.trade ?? "",
      description: "",
    });
    if (job) void checkAddress(job.address);
  }

  async function useDocument(document: DemoDocument) {
    if (!address.trim()) {
      setError("Enter the property address before choosing a document.");
      return;
    }
    setExtracting(true);
    setError("");
    try {
      const result = await request<{
        documentId: string;
        documentName: string;
        manual: boolean;
        proposal: {
          title: string;
          occurredAt: string | null;
          amount: number | null;
          suggestedEventType: string;
          systemType: string | null;
          description: string;
        };
      }>("/jobs/extract", {
        method: "POST",
        body: { address, demoDocumentKey: document.key },
      });

      setDocumentId(result.documentId);
      setDocumentName(result.documentName);

      if (result.manual) {
        toast("Extraction unavailable. Complete the fields manually.");
      } else {
        setForm((previous) => ({
          title: result.proposal.title || previous.title,
          occurredAt: result.proposal.occurredAt ?? previous.occurredAt,
          amount:
            result.proposal.amount === null
              ? previous.amount
              : String(result.proposal.amount),
          eventType: result.proposal.suggestedEventType || previous.eventType,
          systemType: result.proposal.systemType ?? previous.systemType,
          description: result.proposal.description || previous.description,
        }));
      }
    } catch (caught) {
      setError(
        caught instanceof ClientApiError
          ? caught.error.message
          : "That document could not be read.",
      );
    } finally {
      setExtracting(false);
    }
  }

  async function submit() {
    setBusy("submit");
    setError("");
    try {
      await request("/jobs/submit", {
        method: "POST",
        body: {
          jobId,
          address,
          title: form.title,
          occurredAt: form.occurredAt,
          amount: form.amount ? Number(form.amount.replace(/[^0-9.]/g, "")) : null,
          eventType: form.eventType,
          systemType: form.systemType || null,
          description: form.description,
          documentId,
        },
      });
      toast("Submitted to the homeowner for acceptance.");
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ClientApiError
          ? caught.error.message
          : "That submission could not be sent.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function acceptJob(job: Job) {
    setBusy(job.id);
    try {
      await request(`/jobs/${job.id}/accept`, { method: "POST" });
      toast(`Accepted. ${job.address} is now in progress.`);
      router.refresh();
    } catch (error_) {
      toast(
        error_ instanceof ClientApiError
          ? error_.error.message
          : "Could not accept that job.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="mb-[22px] flex flex-wrap items-center justify-between gap-4">
        <div
          data-testid="job-stats"
          className="track-min-0 grid flex-1 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-[16px] rounded-[16px] border border-line bg-white p-[18px_22px]"
        >
          {[
            ["OPEN REQUESTS", stats.open],
            ["IN PROGRESS", stats.inProgress],
            ["AWAITING OWNER", stats.awaiting],
            ["RECORDED", stats.recorded],
          ].map(([label, value]) => (
            <div key={String(label)} className="min-w-0">
              <div className="text-[10.5px] font-bold tracking-[0.12em] text-softer">
                {label}
              </div>
              <div className="mt-[5px] text-[22px] font-extrabold tracking-[-0.02em] text-ink">
                {value}
              </div>
            </div>
          ))}
        </div>
        <Button onClick={() => startSubmission(null)} testId="submit-work-button">
          Submit work to an address
        </Button>
      </div>

      {open ? (
        <section
          data-testid="submission-form"
          className="animate-fade-up mb-[22px] rounded-[16px] bg-white p-[26px_28px]"
          style={{ border: "1.5px solid #e4002b" }}
        >
          <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Submit completed work
          </h2>
          <p className="mt-[8px] mb-[20px] max-w-[600px] text-[13.5px] leading-[1.6] text-muted">
            This proposes a record to the homeowner. They accept or decline it — you
            are not writing into their record directly.
          </p>

          {error ? (
            <div className="mb-[18px]">
              <ErrorBanner>{error}</ErrorBanner>
            </div>
          ) : null}

          <TextField
            testId="submission-address"
            label="Property address"
            value={address}
            onChange={(event) => void checkAddress(event.target.value)}
            placeholder="123 Main Street"
          />
          {check ? (
            <div
              data-testid="submission-address-check"
              data-ok={check.ok}
              className="mt-[8px] text-[13px] font-semibold"
              style={{ color: check.ok ? "#12693b" : "#a8102a" }}
            >
              {check.ok ? "✓" : "✕"} {check.message}
            </div>
          ) : null}

          <div className="mt-[22px]">
            <div className="text-[11px] font-bold tracking-[0.14em] text-softer">
              ATTACH A DOCUMENT
            </div>
            <div className="track-min-0 mt-[12px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[10px]">
              {demoDocuments.map((document) => (
                <button
                  key={document.key}
                  type="button"
                  data-testid="submission-doc"
                  data-doc-key={document.key}
                  disabled={extracting}
                  onClick={() => void useDocument(document)}
                  className={`min-w-0 rounded-[12px] border p-[14px_16px] text-left ${
                    documentName === document.name
                      ? "border-navy bg-card"
                      : "cursor-pointer border-line bg-white hover:border-navy"
                  }`}
                >
                  <div className="text-[14px] font-bold text-ink">
                    {document.title}
                  </div>
                  <div className="mt-[4px] text-[12.5px] text-muted">
                    {document.hint}
                  </div>
                </button>
              ))}
            </div>
            {extracting ? (
              <div className="mt-[12px] flex items-center gap-2 text-[13px] text-muted">
                <Spinner size={14} /> Reading the document…
              </div>
            ) : null}
            {documentName && !extracting ? (
              <Mono className="mt-[10px] block text-[12px] text-green">
                Attached · {documentName}
              </Mono>
            ) : null}
          </div>

          <div className="mt-[22px] grid gap-[16px] sm:grid-cols-2">
            <TextField
              testId="field-title"
              className="sm:col-span-2"
              label="Title"
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
            />
            <TextField
              label="Date of service"
              type="date"
              value={form.occurredAt}
              onChange={(event) => set("occurredAt", event.target.value)}
            />
            <TextField
              label="Amount"
              value={form.amount}
              onChange={(event) => set("amount", event.target.value)}
              placeholder="9860"
            />
            <SelectField
              label="Event type"
              value={form.eventType}
              onChange={(event) => set("eventType", event.target.value)}
              options={AUTHORABLE_EVENT_TYPES.map((value) => ({
                value,
                label: value.replace(/_/g, " "),
              }))}
            />
            <TextField
              label="System"
              value={form.systemType}
              onChange={(event) => set("systemType", event.target.value)}
              placeholder="HVAC"
            />
            <TextArea
              className="sm:col-span-2"
              label="Description"
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
            />
          </div>

          <div className="mt-[22px] flex flex-wrap gap-[10px]">
            <Button
              onClick={() => void submit()}
              disabled={busy === "submit" || !check?.ok}
              testId="submission-send"
            >
              {busy === "submit" ? "Sending…" : "Send to homeowner for acceptance"}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      {jobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          body="Homeowner requests land here. You can also submit completed work to any address with a HomeFax and a homeowner account."
        />
      ) : (
        <div className="space-y-[12px]">
          {jobs.map((job) => {
            const chip = JOB_STATUS[job.status];
            return (
              <article
                key={job.id}
                data-testid="job-card"
                data-job-id={job.id}
                data-status={job.status}
                className="rounded-[14px] bg-white p-[20px_22px]"
                style={{ border: `1px solid ${chip.line ?? "#e3e7ec"}` }}
              >
                <div className="flex flex-wrap items-center gap-[12px]">
                  <JobStatusPill status={job.status} testId="job-status" />
                  <span className="text-[13px] font-semibold text-muted">
                    {job.trade}
                  </span>
                  <div className="min-w-0 flex-1" />
                  <Mono className="shrink-0 text-[11.5px] text-faint">
                    {job.tokenId}
                  </Mono>
                </div>

                <h3 className="mt-[12px] mb-0 text-[16.5px] font-bold text-ink">
                  {job.address}
                </h3>
                <p className="mt-[6px] mb-0 text-[13.5px] leading-[1.6] text-muted">
                  {job.description}
                </p>
                {job.submission ? (
                  <div className="mt-[10px] text-[13px] text-body">
                    Submitted: <strong>{job.submission.title}</strong> ·{" "}
                    {formatDate(job.submission.occurredAt)}
                    {job.submission.amount
                      ? ` · ${formatMoney(job.submission.amount)}`
                      : ""}
                  </div>
                ) : null}

                <div className="mt-[16px]">
                  {job.status === "requested" ? (
                    <Button
                      size="sm"
                      disabled={busy === job.id}
                      onClick={() => void acceptJob(job)}
                      testId="accept-job-button"
                    >
                      {busy === job.id ? "Accepting…" : "Accept job"}
                    </Button>
                  ) : job.status === "accepted" ? (
                    <Button size="sm" onClick={() => startSubmission(job)}>
                      Submit completed work
                    </Button>
                  ) : job.status === "declined" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startSubmission(job)}
                    >
                      Submit a corrected record
                    </Button>
                  ) : (
                    <span className="text-[13px] text-faint">
                      {job.status === "approved"
                        ? "Recorded on the HomeFax."
                        : "Waiting on the homeowner."}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
