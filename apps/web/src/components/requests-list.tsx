"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Job } from "@homefax/contracts";
import { Button } from "./buttons";
import { useToast } from "./feedback";
import { JobStatusPill, Mono } from "./ui";
import { ClientApiError, request } from "@/lib/client";
import { formatDate, formatMoney, JOB_STATUS } from "@/lib/format";

export function RequestsList({ jobs }: { jobs: Job[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(job: Job, action: "accept-submission" | "decline-submission") {
    setBusy(job.id);
    try {
      const result = await request<{ eventId?: string }>(
        `/jobs/${job.id}/${action}`,
        { method: "POST" },
      );
      if (action === "accept-submission") {
        toast("Accepted. Record appended and ledger re-verified.");
        if (result.eventId) {
          router.push(
            `/properties/${job.tokenId}/timeline?new=${result.eventId}#ev-${result.eventId}`,
          );
        }
      } else {
        toast("Declined. Nothing was added to your record.");
      }
      router.refresh();
    } catch (error) {
      toast(
        error instanceof ClientApiError
          ? error.error.message
          : "That action could not be completed.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-[14px]">
      {jobs.map((job) => {
        const chip = JOB_STATUS[job.status];
        const submission = job.submission;
        return (
          <article
            key={job.id}
            data-testid="job-card"
            data-job-id={job.id}
            data-status={job.status}
            className="rounded-[16px] bg-white p-[22px_24px]"
            style={{ border: `1.5px solid ${chip.line ?? "#e3e7ec"}` }}
          >
            <div className="flex flex-wrap items-center gap-[12px]">
              <JobStatusPill status={job.status} testId="job-status" />
              <span className="text-[13px] font-semibold text-muted">
                {job.trade}
              </span>
              <span className="text-[13px] text-faint">
                Requested {formatDate(job.requestedAt)}
              </span>
              <div className="min-w-0 flex-1" />
              <Mono className="shrink-0 text-[11.5px] text-faint">{job.id}</Mono>
            </div>

            <h3 className="mt-[12px] mb-0 text-[17px] font-bold tracking-[-0.015em] text-ink">
              {job.contractorName}
            </h3>
            <p className="mt-[6px] mb-0 text-[14px] leading-[1.6] text-body">
              {job.description}
            </p>

            {submission ? (
              <div
                data-testid="proposed-record"
                className="mt-[18px] rounded-[12px] bg-card p-[18px_20px]"
              >
                <div className="text-[10.5px] font-bold tracking-[0.14em] text-softer">
                  PROPOSED RECORD
                </div>
                <h4 className="mt-[8px] mb-0 text-[16px] font-bold text-ink">
                  {submission.title}
                </h4>
                <div className="mt-[4px] text-[13px] text-muted">
                  {formatDate(submission.occurredAt)} · {submission.contractorName}
                  {submission.amount ? ` · ${formatMoney(submission.amount)}` : ""} ·
                  License {submission.license}
                </div>
                {submission.description ? (
                  <p className="mt-[10px] mb-0 text-[13.5px] leading-[1.6] text-body">
                    {submission.description}
                  </p>
                ) : null}
                {submission.documentName ? (
                  <div className="mt-[12px]">
                    <span className="inline-block rounded-[8px] border border-line bg-white px-[10px] py-[6px] text-[12.5px] font-semibold text-body">
                      📄 {submission.documentName}
                    </span>
                  </div>
                ) : null}

                {job.status === "submitted" ? (
                  <>
                    <div className="mt-[18px] flex flex-wrap gap-[10px]">
                      <Button
                        variant="green"
                        size="sm"
                        disabled={busy === job.id}
                        onClick={() => void act(job, "accept-submission")}
                        testId="accept-submission-button"
                      >
                        {busy === job.id ? "Working…" : "Accept into my HomeFax"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy === job.id}
                        onClick={() => void act(job, "decline-submission")}
                        testId="decline-submission-button"
                      >
                        Decline
                      </Button>
                    </div>
                    <p className="mt-[12px] mb-0 text-[12.5px] leading-[1.6] text-faint">
                      {submission.verified
                        ? "Accepting appends a Professional Verified event with the contractor and license attached."
                        : "This contractor's license is not on file, so accepting records the event as Owner Reported."}{" "}
                      Declining changes nothing on your record.
                    </p>
                  </>
                ) : null}
              </div>
            ) : null}

            {job.status === "approved" ? (
              <Link
                href={`/properties/${job.tokenId}/timeline`}
                data-testid="view-on-timeline-link"
                className="mt-[14px] inline-block text-[13px] font-bold text-link no-underline hover:text-brand"
              >
                View on timeline →
              </Link>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
