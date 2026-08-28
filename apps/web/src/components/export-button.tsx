"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./buttons";
import { PaywallModal, useToast, type PaywallData } from "./feedback";
import { ClientApiError, request } from "@/lib/client";

/**
 * Export is gated behind a paid plan. The gate is enforced by the API — this
 * only surfaces the paywall the server returned, rather than deciding locally
 * whether the user is entitled.
 */
export function ExportButton({
  tokenId,
  disabled = false,
}: {
  tokenId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [paywall, setPaywall] = useState<PaywallData | null>(null);
  const [busy, setBusy] = useState(false);

  async function exportRecord() {
    setBusy(true);
    try {
      const report = await request<{ attestation: { eventsChecked: number } }>(
        `/properties/${tokenId}/export`,
      );
      toast(
        `Report generated. ${report.attestation.eventsChecked} events, ledger intact at export time.`,
      );
    } catch (error) {
      if (error instanceof ClientApiError && error.paywall) {
        setPaywall(error.paywall as unknown as PaywallData);
      } else {
        toast(
          error instanceof ClientApiError
            ? error.error.message
            : "Could not export this record.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function upgrade() {
    setBusy(true);
    try {
      await request("/billing/upgrade", {
        method: "POST",
        body: { plan: "agent_pro", cycle: "monthly" },
      });
      setPaywall(null);
      toast("Upgraded to Agent Pro.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || busy}
        onClick={() => void exportRecord()}
      >
        {busy ? "Working…" : "Export record"}
      </Button>
      <PaywallModal
        paywall={paywall}
        busy={busy}
        onClose={() => setPaywall(null)}
        onUpgrade={() => void upgrade()}
      />
    </>
  );
}
