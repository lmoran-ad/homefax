import { PageShell } from "@/components/page-shell";
import { ClaimScreen } from "@/components/claim-screen";
import { loadProperty, loadSession } from "@/lib/property";

export const dynamic = "force-dynamic";

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const [{ property, claim, homeClaim, claimState, seededStats }, user] =
    await Promise.all([loadProperty(tokenId), loadSession()]);

  return (
    <PageShell width={1160}>
      <ClaimScreen
        property={property}
        role={user.role}
        userName={user.name}
        claim={claim}
        homeClaim={homeClaim}
        claimStateKey={claimState.key}
        seededStats={seededStats}
      />
    </PageShell>
  );
}
