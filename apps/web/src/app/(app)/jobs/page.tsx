import { redirect } from "next/navigation";
import type { DemoDocument, Job, SessionUser } from "@homefax/contracts";
import { PageShell, PageHeading } from "@/components/page-shell";
import { JobsWorkspace } from "@/components/jobs-workspace";
import { apiFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

type JobsResponse = {
  jobs: Job[];
  stats: { open: number; inProgress: number; awaiting: number; recorded: number };
  demoDocuments: DemoDocument[];
};

export default async function JobsPage() {
  const { user } = await apiFetch<{ user: SessionUser }>("/auth/me");
  if (user.role !== "contractor") redirect("/dashboard");

  const data = await apiFetch<JobsResponse>("/jobs");

  return (
    <PageShell>
      <PageHeading
        title="Jobs"
        lead="Accept homeowner requests and submit completed work directly to an address. A submission is a proposal — the owner can accept or decline it, but cannot alter it."
      />
      <JobsWorkspace
        jobs={data.jobs}
        stats={data.stats}
        demoDocuments={data.demoDocuments}
      />
    </PageShell>
  );
}
