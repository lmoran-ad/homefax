"use client";

import { useMemo, useState } from "react";
import type {
  DocumentSummary,
  PropertyDetail,
  PropertyEvent,
  TimelineCategory,
} from "@homefax/contracts";
import { categoryOfEvent, TIMELINE_CATEGORIES } from "@homefax/contracts";
import { DocumentModal } from "./document-modal";
import { FilterPills } from "./fields";
import { useToast } from "./feedback";
import { Mono, VerificationBadge } from "./ui";
import { formatDate, hashFooter, VERIFICATION } from "@/lib/format";

export function Timeline({
  property,
  highlightIds = [],
}: {
  property: PropertyDetail;
  highlightIds?: string[];
}) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<TimelineCategory>("All");
  const [openDocument, setOpenDocument] = useState<DocumentSummary | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>([["All", property.events.length]]);
    for (const event of property.events) {
      const category = categoryOfEvent(event.eventType);
      map.set(category, (map.get(category) ?? 0) + 1);
    }
    return map;
  }, [property.events]);

  const visible = property.events.filter(
    (event) => filter === "All" || categoryOfEvent(event.eventType) === filter,
  );

  // Grouped by year, newest first, with a rule under each year heading.
  const byYear = useMemo(() => {
    const groups = new Map<string, PropertyEvent[]>();
    for (const event of visible) {
      const year = event.occurredAt.slice(0, 4);
      groups.set(year, [...(groups.get(year) ?? []), event]);
    }
    return [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [visible]);

  return (
    <>
      <FilterPills
        testId="timeline-filter"
        value={filter}
        onChange={(next) => setFilter(next as TimelineCategory)}
        options={TIMELINE_CATEGORIES.map((category) => ({
          value: category,
          label: category,
          count: counts.get(category) ?? 0,
        }))}
      />

      <div className="mt-[26px] space-y-[30px]">
        {byYear.map(([year, events]) => (
          <section key={year}>
            <div className="mb-[14px] flex items-center gap-3">
              <h3 className="m-0 text-[15px] font-extrabold tracking-[0.02em] text-ink">
                {year}
              </h3>
              <div className="h-px flex-1 bg-line" />
            </div>

            <div className="space-y-[12px]">
              {events.map((event) => (
                <article
                  key={event.id}
                  id={`ev-${event.id}`}
                  data-testid="timeline-event"
                  data-event-id={event.id}
                  data-verification={event.verificationLevel}
                  className="scroll-mt-[120px] rounded-[14px] border border-line bg-white p-[18px_20px]"
                  style={
                    highlightIds.includes(event.id)
                      ? { boxShadow: "0 0 0 3px #e4002b40" }
                      : undefined
                  }
                >
                  <div className="flex flex-wrap items-center gap-[10px]">
                    <span className="text-[12.5px] font-semibold text-muted">
                      {formatDate(event.occurredAt)}
                    </span>
                    <VerificationBadge
                      level={event.verificationLevel}
                      testId="event-verification"
                    />
                    <Mono className="text-[11px] tracking-[0.04em] text-faint">
                      {event.eventType}
                    </Mono>
                    {highlightIds.includes(event.id) ? (
                      <span
                        data-testid="event-new-flag"
                        className="rounded-[5px] bg-brand px-[7px] py-[2px] text-[10px] font-bold tracking-[0.08em] text-white"
                      >
                        NEW
                      </span>
                    ) : null}
                    {event.visibility === "RESTRICTED" ? (
                      <span className="rounded-[5px] bg-neutral-bg px-[7px] py-[2px] text-[10px] font-bold tracking-[0.08em] text-grey">
                        RESTRICTED
                      </span>
                    ) : null}
                  </div>

                  <h4
                    data-testid="event-title"
                    className="mt-[10px] mb-0 text-[17px] font-bold tracking-[-0.015em] text-ink"
                  >
                    {event.title}
                  </h4>
                  {event.meta ? (
                    <div className="mt-[4px] text-[13.5px] text-muted">
                      {event.meta}
                    </div>
                  ) : null}
                  {event.description ? (
                    <p className="mt-[10px] mb-0 text-[14px] leading-[1.6] text-body">
                      {event.description}
                    </p>
                  ) : null}

                  {event.documents.length > 0 ? (
                    <div className="mt-[14px] flex flex-wrap gap-[8px]">
                      {event.documents.map((document) => {
                        const restricted = document.visibility === "RESTRICTED";
                        return (
                          <button
                            key={document.id}
                            type="button"
                            data-testid="document-chip"
                            data-visibility={document.visibility}
                            onClick={() => {
                              if (restricted) {
                                toast(
                                  "That document is restricted and is not available in the demo viewer.",
                                );
                                return;
                              }
                              setOpenDocument(document);
                            }}
                            className={`rounded-[8px] border px-[10px] py-[6px] text-[12.5px] font-semibold ${
                              restricted
                                ? "cursor-not-allowed border-line bg-card text-faint"
                                : "cursor-pointer border-line bg-white text-body hover:border-navy hover:text-navy"
                            }`}
                          >
                            {restricted ? "🔒" : "📄"} {document.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  <div
                    data-testid="event-hash"
                    className="mt-[14px] border-t border-line-light pt-[10px] text-[10.5px] break-all text-faint"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {hashFooter(event.eventHash, event.previousHash)}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-[26px] text-[14px] text-muted">
          No events in this category.
        </p>
      ) : null}

      <DocumentModal
        tokenId={property.tokenId}
        document={openDocument}
        onClose={() => setOpenDocument(null)}
      />
    </>
  );
}

export function VerificationLegend() {
  return (
    <section className="rounded-[16px] border border-line bg-white p-[22px_24px]">
      <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
        Verification legend
      </h3>
      <div className="mt-[14px] space-y-[14px]">
        {(
          [
            "SOURCE_VERIFIED",
            "PROFESSIONAL_VERIFIED",
            "OWNER_REPORTED",
            "AI_EXTRACTED_PENDING",
            "UNVERIFIED",
          ] as const
        ).map((level) => (
          <div key={level}>
            <VerificationBadge level={level} />
            <p className="mt-[7px] mb-0 text-[12.5px] leading-[1.55] text-muted">
              {VERIFICATION[level].description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AppendOnlyNote() {
  return (
    <section className="rounded-[16px] border border-line bg-card p-[22px_24px]">
      <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
        Append-only
      </h3>
      <p className="mt-[10px] mb-0 text-[13px] leading-[1.6] text-muted">
        Nothing on this timeline is ever edited or deleted. A correction is a new
        event that references what it supersedes, so the record shows both what was
        believed and what replaced it.
      </p>
      <p className="mt-[10px] mb-0 text-[13px] leading-[1.6] text-muted">
        Each event is hashed together with the hash before it. Altering a committed
        event breaks the chain from that point on, which is what makes the record
        tamper-evident rather than merely trusted.
      </p>
    </section>
  );
}
