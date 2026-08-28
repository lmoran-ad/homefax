import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import type { Job, PropertySummary, SessionUser } from "@hometoken/contracts";
import { AppHeader } from "@/components/app-header";
import { apiFetchOptional } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await apiFetchOptional<{ user: SessionUser }>("/auth/me");
  if (!session) redirect("/login");
  const { user } = session;

  // Header badge counts. Both are best-effort: a failure here must not take
  // the whole shell down, so they fall back to zero.
  const [saved, jobs] = await Promise.all([
    user.role === "agent"
      ? apiFetchOptional<{ results: PropertySummary[] }>("/properties/saved")
      : Promise.resolve(null),
    user.role === "homeowner"
      ? apiFetchOptional<{ jobs: Job[] }>("/jobs")
      : Promise.resolve(null),
  ]);

  const counts = {
    saved: saved?.results.length ?? 0,
    requests:
      jobs?.jobs.filter((job) => job.status === "submitted").length ?? 0,
  };

  return (
    <div className="min-h-screen">
      <AppHeader user={user} counts={counts} />
      <main>{children}</main>
    </div>
  );
}
