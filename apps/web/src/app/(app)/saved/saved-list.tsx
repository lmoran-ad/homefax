"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PropertySummary } from "@homefax/contracts";
import { useToast } from "@/components/feedback";
import { PropertyRow } from "@/components/property-cards";
import { request } from "@/lib/client";

export function SavedList({ properties }: { properties: PropertySummary[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [removing, setRemoving] = useState<string | null>(null);

  async function remove(tokenId: string) {
    setRemoving(tokenId);
    try {
      await request(`/properties/${tokenId}/save`, { method: "POST" });
      toast("Removed from saved.");
      router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-[10px]">
      {properties.map((property) => (
        <PropertyRow
          key={property.tokenId}
          property={property}
          action={
            <button
              type="button"
              onClick={() => void remove(property.tokenId)}
              data-testid="saved-remove"
              disabled={removing === property.tokenId}
              className="cursor-pointer rounded-[8px] border border-line bg-white px-[13px] py-[8px] text-[13px] font-bold text-body transition-colors hover:border-danger-line hover:text-error"
            >
              {removing === property.tokenId ? "Removing…" : "Remove"}
            </button>
          }
        />
      ))}
    </div>
  );
}
