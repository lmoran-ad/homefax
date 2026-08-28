import type { SessionUser, Subscription } from "@homefax/contracts";
import { PageShell, PageHeading } from "@/components/page-shell";
import { SettingsScreen } from "@/components/settings-screen";
import { apiFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, subscription } = await apiFetch<{
    user: SessionUser;
    subscription: Subscription;
  }>("/auth/me");

  return (
    <PageShell width={1000}>
      <PageHeading title="Account settings" />
      <SettingsScreen user={user} subscription={subscription} />
    </PageShell>
  );
}
