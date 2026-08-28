import { LockPanel } from "@/components/lock-panel";
import { PageShell } from "@/components/page-shell";
import { AskThisHome } from "@/components/ask-this-home";
import { loadProperty, loadSession } from "@/lib/property";

export const dynamic = "force-dynamic";

export default async function AskPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const [{ property, contribute }, user] = await Promise.all([
    loadProperty(tokenId),
    loadSession(),
  ]);

  if (!contribute.allowed) {
    return (
      <PageShell>
        <LockPanel contribute={contribute} tokenId={tokenId} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <AskThisHome property={property} plan={user.plan} />
    </PageShell>
  );
}
