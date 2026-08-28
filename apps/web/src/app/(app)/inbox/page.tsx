import { redirect } from "next/navigation";
import type { Job, SessionUser } from "@hometoken/contracts";
import { ButtonLink } from "@/components/buttons";
import { PageShell, PageHeading } from "@/components/page-shell";
import { RequestsList } from "@/components/requests-list";
import { EmptyState } from "@/components/ui";
import { apiFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const { user } = await apiFetch<{ user: SessionUser }>("/auth/me");
  if (user.role !== "homeowner") redirect("/dashboard");

  const { jobs } = await apiFetch<{ jobs: Job[] }>("/jobs");

  return (
    <PageShell>
      <PageHeading
        title="Requests"
        lead="Work you have asked for, and records contractors have proposed. Nothing enters your HomeToken until you accept it."
      />

      {jobs.length === 0 ? (
        <EmptyState
          title="No requests yet"
          body="Find a verified contractor and request work at your home. Anything they submit comes back here for your approval."
          action={<ButtonLink href="/pros">Find a Pro</ButtonLink>}
        />
      ) : (
        <RequestsList jobs={jobs} />
      )}
    </PageShell>
  );
}
