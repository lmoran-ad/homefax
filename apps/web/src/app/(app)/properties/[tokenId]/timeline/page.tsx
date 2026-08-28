import { ButtonLink } from "@/components/buttons";
import { ExportButton } from "@/components/export-button";
import { PageShell } from "@/components/page-shell";
import { AppendOnlyNote, Timeline, VerificationLegend } from "@/components/timeline";
import { loadProperty, loadSession } from "@/lib/property";

export const dynamic = "force-dynamic";

export default async function TimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ tokenId: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { tokenId } = await params;
  const [{ property, contribute }, user, query] = await Promise.all([
    loadProperty(tokenId),
    loadSession(),
    searchParams,
  ]);

  const highlightIds = query.new ? query.new.split(",") : [];

  return (
    <PageShell>
      <div className="track-min-0 grid items-start gap-[22px] lg:grid-cols-[minmax(0,1.7fr)_minmax(270px,0.8fr)]">
        <div className="min-w-0">
          <div className="mb-[20px] flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.03em] text-ink">
                Timeline
              </h1>
              <p className="mt-[8px] mb-0 max-w-[540px] text-[14px] leading-[1.6] text-muted">
                Every event this property has recorded, oldest to newest within each
                year. Nothing here is ever edited or removed.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-[10px]">
              <ExportButton tokenId={tokenId} disabled={!contribute.allowed} />
              <ButtonLink
                href={`/properties/${tokenId}/add-record`}
                variant="outline"
                size="sm"
              >
                Add Record
              </ButtonLink>
            </div>
          </div>

          <Timeline property={property} highlightIds={highlightIds} />
        </div>

        <div className="sticky top-[96px] min-w-0 space-y-[18px]">
          <VerificationLegend />
          <AppendOnlyNote />
        </div>
      </div>
    </PageShell>
  );
}
