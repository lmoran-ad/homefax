"use client";

import { useState } from "react";
import type { DocumentSummary, Visibility } from "@hometoken/contracts";
import { DocumentModal } from "./document-modal";
import { FilterPills } from "./fields";
import { useToast } from "./feedback";
import { EmptyState, Mono, Pill } from "./ui";
import { formatDate } from "@/lib/format";

const VISIBILITY: Record<Visibility, { bg: string; fg: string }> = {
  PUBLIC: { bg: "#e7f4ec", fg: "#12693b" },
  AUTHENTICATED: { bg: "#e8f0fb", fg: "#1a4f9c" },
  RESTRICTED: { bg: "#eef1f4", fg: "#4a5663" },
};

const ICONS: Record<string, string> = {
  Invoice: "🧾",
  Permit: "🏛",
  Deed: "📜",
  Report: "📋",
  Warranty: "🛡",
  Inspection: "🔍",
  Notice: "📨",
  Claim: "🔒",
};

export function DocumentsGrid({
  tokenId,
  documents,
}: {
  tokenId: string;
  documents: DocumentSummary[];
}) {
  const { toast } = useToast();
  const [filter, setFilter] = useState("All");
  const [open, setOpen] = useState<DocumentSummary | null>(null);

  const counts = {
    All: documents.length,
    Public: documents.filter((d) => d.visibility === "PUBLIC").length,
    Authenticated: documents.filter((d) => d.visibility === "AUTHENTICATED").length,
    Restricted: documents.filter((d) => d.visibility === "RESTRICTED").length,
  };

  const visible = documents.filter((document) =>
    filter === "All"
      ? true
      : document.visibility === filter.toUpperCase(),
  );

  return (
    <>
      <FilterPills
        value={filter}
        onChange={setFilter}
        options={[
          { value: "All", label: "All", count: counts.All },
          { value: "Public", label: "Public", count: counts.Public },
          {
            value: "Authenticated",
            label: "Authenticated",
            count: counts.Authenticated,
          },
          { value: "Restricted", label: "Restricted", count: counts.Restricted },
        ]}
      />

      {visible.length === 0 ? (
        <div className="mt-[22px]">
          <EmptyState
            title="No documents in this category"
            body="Documents arrive attached to events — from county records, contractor submissions, or anything added through Add Record."
          />
        </div>
      ) : (
        <div className="track-min-0 mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
          {visible.map((document) => {
            const restricted = document.visibility === "RESTRICTED";
            const chip = VISIBILITY[document.visibility];
            return (
              <button
                key={document.id}
                type="button"
                onClick={() => {
                  if (restricted) {
                    toast(
                      "That document is restricted and is not available in the demo viewer.",
                    );
                    return;
                  }
                  setOpen(document);
                }}
                className={`flex min-w-0 flex-col rounded-[14px] border border-line bg-white p-[18px_20px] text-left ${
                  restricted
                    ? "cursor-not-allowed opacity-80"
                    : "cursor-pointer hover:border-navy"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex h-[36px] w-[36px] items-center justify-center rounded-[9px] bg-card text-[16px]"
                    aria-hidden="true"
                  >
                    {ICONS[document.kind] ?? "📄"}
                  </div>
                  <Pill
                    label={document.visibility}
                    bg={chip.bg}
                    fg={chip.fg}
                  />
                </div>

                <div className="mt-[14px] truncate text-[15px] font-bold text-ink">
                  {document.name}
                </div>
                {document.eventTitle ? (
                  <div className="mt-[4px] truncate text-[13px] text-muted">
                    {document.eventTitle}
                  </div>
                ) : null}
                <div className="mt-[8px] text-[12.5px] text-faint">
                  {document.occurredAt ? formatDate(document.occurredAt) : "—"} ·{" "}
                  {document.kind}
                </div>

                <div className="flex-1" />

                <Mono className="mt-[14px] block truncate border-t border-line-light pt-[10px] text-[10.5px] text-faint">
                  sha256 {document.sha256.slice(0, 20)}…
                </Mono>
              </button>
            );
          })}
        </div>
      )}

      <DocumentModal
        tokenId={tokenId}
        document={open}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
