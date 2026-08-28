import type { PropertySummary } from "@hometoken/contracts";
import { ButtonLink } from "@/components/buttons";
import { PageShell, PageHeading } from "@/components/page-shell";
import { PropertyRow } from "@/components/property-cards";
import { SearchCard } from "@/components/search-card";
import { EmptyState } from "@/components/ui";
import { apiFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { results } = await apiFetch<{ results: PropertySummary[] }>(
    `/properties/search?q=${encodeURIComponent(q)}`,
  );

  return (
    <PageShell>
      <PageHeading title="Properties" />
      <SearchCard initialQuery={q} />

      <p className="mt-[22px] mb-[16px] text-[13.5px] text-muted">
        {q ? (
          <>
            {results.length} {results.length === 1 ? "result" : "results"} for{" "}
            <span className="font-bold text-ink">{q}</span>
          </>
        ) : (
          <>{results.length} HomeTokens in the demo dataset</>
        )}
      </p>

      {results.length === 0 ? (
        <EmptyState
          title="No HomeTokens match that search"
          body="Try 123 Main, Denver, or a HomeToken ID such as HT-US-CO-DEN-00001234."
          action={<ButtonLink href="/properties">Show all properties</ButtonLink>}
        />
      ) : (
        <div className="space-y-[10px]">
          {results.map((property) => (
            <PropertyRow key={property.tokenId} property={property} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
