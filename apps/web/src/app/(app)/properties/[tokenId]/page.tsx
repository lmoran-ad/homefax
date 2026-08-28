import { PageShell } from "@/components/page-shell";
import {
  ClaimActionButton,
  PropertyHero,
  ReVerifyButton,
} from "@/components/property-hero";
import {
  HealthCard,
  LedgerBar,
  OwnershipCard,
  RecentHistory,
  SalesAndTaxCard,
  StewardshipBar,
  SystemsGrid,
} from "@/components/property-overview";
import { loadProperty, loadSession } from "@/lib/property";

export const dynamic = "force-dynamic";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const [{ property, claim, claimState, contribute, saved }, user] =
    await Promise.all([loadProperty(tokenId), loadSession()]);

  return (
    <PageShell>
      {/* `minmax(0, …)` on both tracks, so neither column can be pinned to its
          min-content width and spill out of the cards inside it. */}
      <div className="track-min-0 grid items-start gap-[22px] lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
        <div className="min-w-0 space-y-[22px]">
          <PropertyHero
            property={property}
            role={user.role}
            saved={saved}
            canContribute={contribute.allowed}
          />

          {user.role === "agent" ? (
            <StewardshipBar
              claim={claim}
              claimStateKey={claimState.key}
              action={
                <ClaimActionButton
                  tokenId={tokenId}
                  claimStateKey={claimState.key}
                  role={user.role}
                />
              }
            />
          ) : null}

          <LedgerBar
            ledger={property.ledger}
            action={<ReVerifyButton tokenId={tokenId} />}
          />

          <section>
            <h2 className="mt-0 mb-[16px] text-[19px] font-extrabold tracking-[-0.02em] text-ink">
              Major systems
            </h2>
            <SystemsGrid
              systems={property.systems}
              tokenId={tokenId}
              showFindAPro={user.role === "homeowner"}
            />
          </section>

          <RecentHistory property={property} />
        </div>

        <div className="min-w-0 space-y-[22px]">
          <HealthCard health={property.health} />
          <OwnershipCard periods={property.ownership} />
          <SalesAndTaxCard events={property.events} />
        </div>
      </div>
    </PageShell>
  );
}
