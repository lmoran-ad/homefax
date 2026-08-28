"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./buttons";

const SUGGESTIONS = [
  "123 Main",
  "Denver",
  "HF-US-CO-DEN-00001234",
  "DEN-1234-567-89",
];

export function SearchCard({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function search(next: string) {
    router.push(`/properties?q=${encodeURIComponent(next)}`);
  }

  return (
    <div className="rounded-[16px] border border-line bg-white p-[22px]">
      <form
        className="flex flex-wrap gap-[10px]"
        onSubmit={(event) => {
          event.preventDefault();
          search(query);
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Address, HomeFax ID or parcel ID"
          data-testid="search-input"
          aria-label="Search HomeFaxes"
          className="min-w-[220px] flex-1 rounded-[10px] border border-input bg-white px-4 py-[14px] text-[15px] text-ink placeholder:text-faint"
        />
        <Button type="submit" variant="navy" size="lg" testId="search-submit">
          Search
        </Button>
      </form>

      <div className="mt-[14px] flex flex-wrap items-center gap-[8px]">
        <span className="text-[11px] font-bold tracking-[0.12em] text-softer">TRY</span>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            data-testid="search-suggestion"
            onClick={() => {
              setQuery(suggestion);
              search(suggestion);
            }}
            className="cursor-pointer rounded-[8px] border border-line bg-card px-[10px] py-[5px] text-[12px] text-body hover:border-navy hover:text-navy"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
