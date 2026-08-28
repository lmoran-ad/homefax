import type { DemoAccount } from "@hometoken/contracts";
import { apiFetch } from "@/lib/api";
import { LoginScreen } from "./login-screen";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const [{ accounts }, params] = await Promise.all([
    apiFetch<{ accounts: DemoAccount[] }>("/auth/demo-accounts"),
    searchParams,
  ]);

  const preselected =
    accounts.find((a) => a.email === params.account) ?? accounts[0]!;

  return <LoginScreen accounts={accounts} initialEmail={preselected.email} />;
}
