import type { PropertySummary, SessionUser } from "@homefax/contracts";
import { ButtonLink } from "@/components/buttons";
import { PageShell, PageHeading } from "@/components/page-shell";
import { PropertyRow } from "@/components/property-cards";
import { SaveButton } from "@/components/save-button";
import { SearchCard } from "@/components/search-card";
import { EmptyState } from "@/components/ui";
import { apiFetch, apiFetchOptional } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;

  // Saving is an agent affordance, so the saved list is only worth fetching
  // for one. Both are best-effort — a search that renders without stars beats
  // a search that does not render.
  const [{ results }, session] = await Promise.all([
    apiFetch<{ results: PropertySummary[] }>(
      `/properties/search?q=${encodeURIComponent(q)}`,
    ),
    apiFetchOptional<{ user: SessionUser }>("/auth/me"),
  ]);

  const isAgent = session?.user.role === "agent";
  const saved = isAgent
    ? await apiFetchOptional<{ results: PropertySummary[] }>("/properties/saved")
    : null;
  const savedTokens = new Set(saved?.results.map((p) => p.tokenId) ?? []);

  return (
    <PageShell>
      <PageHeading title="Properties" />
      <SearchCard initialQuery={q} />

      <p data-testid="result-count" className="mt-[22px] mb-[16px] text-[13.5px] text-muted">
        {q ? (
          <>
            {results.length} {results.length === 1 ? "result" : "results"} for{" "}
            <span className="font-bold text-ink">{q}</span>
          </>
        ) : (
          <>{results.length} HomeFaxes in the demo dataset</>
        )}
      </p>

      {results.length === 0 ? (
        <EmptyState
          title="No HomeFaxes match that search"
          body="Try 123 Main, Denver, or a HomeFax ID such as HF-US-CO-DEN-00001234."
          action={<ButtonLink href="/properties">Show all properties</ButtonLink>}
        />
      ) : (
        <div className="space-y-[10px]">
          {results.map((property) => (
            <PropertyRow
              key={property.tokenId}
              property={property}
              action={
                isAgent ? (
                  <SaveButton
                    tokenId={property.tokenId}
                    saved={savedTokens.has(property.tokenId)}
                    size="sm"
                  />
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
