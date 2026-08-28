import type { DemoDocument } from "@homefax/contracts";
import { LockPanel } from "@/components/lock-panel";
import { PageShell } from "@/components/page-shell";
import { AddRecord } from "@/components/add-record";
import { apiFetch } from "@/lib/api";
import { loadProperty } from "@/lib/property";

export const dynamic = "force-dynamic";

export default async function AddRecordPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const { property, contribute } = await loadProperty(tokenId);

  if (!contribute.allowed) {
    return (
      <PageShell>
        <LockPanel contribute={contribute} tokenId={tokenId} />
      </PageShell>
    );
  }

  const { documents } = await apiFetch<{ documents: DemoDocument[] }>(
    "/demo-documents",
  );

  return (
    <PageShell>
      <AddRecord tokenId={tokenId} address={property.address} demoDocuments={documents} />
    </PageShell>
  );
}
