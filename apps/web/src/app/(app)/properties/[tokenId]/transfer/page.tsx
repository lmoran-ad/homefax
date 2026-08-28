import { redirect } from "next/navigation";
import { LockPanel } from "@/components/lock-panel";
import { PageShell } from "@/components/page-shell";
import { TransferScreen } from "@/components/transfer-screen";
import { loadProperty, loadSession } from "@/lib/property";

export const dynamic = "force-dynamic";

export default async function TransferPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const [{ property, contribute }, user] = await Promise.all([
    loadProperty(tokenId),
    loadSession(),
  ]);

  // Transfer hands the record to the homeowner, so it belongs to the steward.
  if (user.role !== "agent") redirect(`/properties/${tokenId}`);

  if (!contribute.allowed) {
    return (
      <PageShell>
        <LockPanel contribute={contribute} tokenId={tokenId} />
      </PageShell>
    );
  }

  return (
    <PageShell width={1160}>
      <TransferScreen
        tokenId={tokenId}
        address={property.address}
        stewardName={user.name}
        eventCount={property.events.length}
      />
    </PageShell>
  );
}
