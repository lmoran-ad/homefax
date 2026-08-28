import type {
  PlanCard,
  SessionUser,
  Subscription,
  UnitEconomicsRow,
} from "@hometoken/contracts";
import { PageShell } from "@/components/page-shell";
import { PlansScreen } from "@/components/plans-screen";
import { apiFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const [plansData, me] = await Promise.all([
    apiFetch<{
      plans: PlanCard[];
      unitEconomics: UnitEconomicsRow[];
      unitEconomicsTotal: string;
    }>("/plans"),
    apiFetch<{ user: SessionUser; subscription: Subscription }>("/auth/me"),
  ]);

  return (
    <PageShell>
      <PlansScreen
        plans={plansData.plans}
        unitEconomics={plansData.unitEconomics}
        unitEconomicsTotal={plansData.unitEconomicsTotal}
        currentPlan={me.user.plan}
        cycle={me.subscription.cycle}
      />
    </PageShell>
  );
}
