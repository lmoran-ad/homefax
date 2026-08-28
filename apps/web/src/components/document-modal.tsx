"use client";

import { useEffect, useState } from "react";
import type { DocumentSummary } from "@homefax/contracts";
import { Button } from "./buttons";
import { Modal } from "./feedback";
import { Spinner } from "./ui";
import { ClientApiError, request } from "@/lib/client";

type Body = { name: string; sha256: string; text: string };

/**
 * Fetches the document body on open rather than inlining it in the property
 * payload, so the API re-checks visibility at read time. A restricted document
 * is refused here even though the UI already declines to open it.
 */
export function DocumentModal({
  tokenId,
  document,
  onClose,
}: {
  tokenId: string;
  document: DocumentSummary | null;
  onClose: () => void;
}) {
  const [body, setBody] = useState<Body | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!document) {
      setBody(null);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    request<Body>(`/properties/${tokenId}/documents/${document.id}`)
      .then((result) => {
        if (!cancelled) setBody(result);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(
          caught instanceof ClientApiError
            ? caught.error.message
            : "That document could not be opened.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [document, tokenId]);

  return (
    <Modal open={Boolean(document)} onClose={onClose} labelledBy="document-title">
      {document ? (
        <>
          <div
            data-testid="document-modal"
            className="flex items-start justify-between gap-4 border-b border-line p-[22px_26px]"
          >
            <div className="min-w-0">
              <div className="text-[10.5px] font-bold tracking-[0.14em] text-softer">
                {document.kind.toUpperCase()} · {document.visibility}
              </div>
              <h2
                id="document-title"
                className="mt-[6px] mb-0 truncate text-[19px] font-extrabold tracking-[-0.02em] text-ink"
              >
                {document.name}
              </h2>
              {document.eventTitle ? (
                <div className="mt-[4px] truncate text-[13px] text-muted">
                  From {document.eventTitle}
                </div>
              ) : null}
            </div>
            <Button variant="outline" size="sm" onClick={onClose} testId="modal-close">
              Close
            </Button>
          </div>

          <div className="min-h-[160px] flex-1 overflow-auto bg-card p-[22px_26px]">
            {loading ? (
              <div className="flex items-center gap-3 text-[14px] text-muted">
                <Spinner /> Opening document…
              </div>
            ) : error ? (
              <div className="rounded-[10px] border border-danger-line bg-danger-bg p-4 text-[13.5px] leading-[1.6] text-error">
                {error}
              </div>
            ) : (
              <pre
                className="m-0 text-[13px] leading-[1.65] whitespace-pre-wrap text-body"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {body?.text}
              </pre>
            )}
          </div>

          <div
            data-testid="document-sha"
            className="border-t border-line p-[14px_26px] text-[10.5px] break-all text-faint"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            sha256 {document.sha256}
          </div>
        </>
      ) : null}
    </Modal>
  );
}
