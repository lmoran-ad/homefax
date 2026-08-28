"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./feedback";
import { request } from "@/lib/client";

/**
 * Saves a property from wherever it is listed.
 *
 * The state flips before the request finishes and rolls back if it fails —
 * this is a bookmark, and waiting on a round trip to acknowledge a star makes
 * a list feel broken. Saving claims nothing and notifies nobody, so an
 * optimistic flip costs nothing when it is wrong.
 */
export function SaveButton({
  tokenId,
  saved,
  size = "md",
}: {
  tokenId: string;
  saved: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaved, setIsSaved] = useState(saved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !isSaved;
    setIsSaved(next);
    setBusy(true);
    try {
      await request(`/properties/${tokenId}/save`, { method: "POST" });
      toast(next ? "Saved." : "Removed from saved.");
      router.refresh();
    } catch {
      setIsSaved(!next);
      toast("Could not update your saved list.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      data-testid="save-toggle"
      data-token-id={tokenId}
      data-saved={isSaved}
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove ${tokenId} from saved` : `Save ${tokenId}`}
      className={`shrink-0 cursor-pointer rounded-[8px] border bg-white font-bold disabled:cursor-not-allowed ${
        size === "sm"
          ? "px-[10px] py-[6px] text-[12.5px]"
          : "px-[12px] py-[7px] text-[13px]"
      } ${
        isSaved
          ? "border-navy text-navy"
          : "border-line text-body hover:border-navy hover:text-navy"
      }`}
    >
      {isSaved ? "★ Saved" : "☆ Save"}
    </button>
  );
}
