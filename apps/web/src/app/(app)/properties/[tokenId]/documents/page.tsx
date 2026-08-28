import { PageShell } from "@/components/page-shell";
import { DocumentsGrid } from "@/components/documents-grid";
import { loadProperty } from "@/lib/property";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const { property } = await loadProperty(tokenId);

  return (
    <PageShell>
      <div className="mb-[20px]">
        <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.03em] text-ink">
          Documents
        </h1>
        <p className="mt-[8px] mb-0 max-w-[620px] text-[14px] leading-[1.6] text-muted">
          Every document is content-addressed: its SHA-256 is taken over the stored
          bytes, so the file behind an event can be confirmed as the one that was
          approved.
        </p>
      </div>

      <DocumentsGrid tokenId={tokenId} documents={property.documents} />
    </PageShell>
  );
}
