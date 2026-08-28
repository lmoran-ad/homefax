import type { Contractor, SessionUser } from "@hometoken/contracts";
import { PageShell, PageHeading } from "@/components/page-shell";
import { FindAPro } from "@/components/find-a-pro";
import { apiFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ProsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; trade?: string; verifiedOnly?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({
    q: params.q ?? "",
    trade: params.trade ?? "All",
    verifiedOnly: params.verifiedOnly ?? "false",
  });

  const [{ results, trades }, { user }] = await Promise.all([
    apiFetch<{
      results: Contractor[];
      trades: { trade: string; count: number }[];
    }>(`/contractors?${query.toString()}`),
    apiFetch<{ user: SessionUser }>("/auth/me"),
  ]);

  return (
    <PageShell>
      <PageHeading
        title="Find a Pro"
        lead="Contractors whose licenses are checked against the state board. A verification is a license on file — not an endorsement, a warranty, or a quality rating."
      />
      <FindAPro
        contractors={results}
        trades={trades}
        role={user.role}
        initial={{
          q: params.q ?? "",
          trade: params.trade ?? "All",
          verifiedOnly: params.verifiedOnly === "true",
        }}
      />
    </PageShell>
  );
}
