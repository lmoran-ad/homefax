import { redirect } from "next/navigation";
import type { PropertySummary, SessionUser } from "@hometoken/contracts";
import { ButtonLink } from "@/components/buttons";
import { PageShell, PageHeading } from "@/components/page-shell";
import { EmptyState } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { SavedList } from "./saved-list";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const { user } = await apiFetch<{ user: SessionUser }>("/auth/me");
  // Saving is an agent feature; the API refuses it for other roles, and the
  // nav does not offer it, so anyone arriving here directly goes home.
  if (user.role !== "agent") redirect("/dashboard");

  const { results } = await apiFetch<{ results: PropertySummary[] }>(
    "/properties/saved",
  );

  return (
    <PageShell>
      <PageHeading
        title="Saved properties"
        lead="A bookmark and nothing more. Saving a HomeToken claims nothing and notifies no one."
      />

      {results.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          body="Save a HomeToken from its record to keep it here while you work your book."
          action={<ButtonLink href="/properties">Browse properties</ButtonLink>}
        />
      ) : (
        <SavedList properties={results} />
      )}
    </PageShell>
  );
}
