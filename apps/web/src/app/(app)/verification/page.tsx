import { redirect } from "next/navigation";
import type {
  Contractor,
  SessionUser,
  VerificationChecklistItem,
} from "@hometoken/contracts";
import { PageShell, PageHeading } from "@/components/page-shell";
import { VerificationScreen } from "@/components/verification-screen";
import { apiFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  const { user } = await apiFetch<{ user: SessionUser }>("/auth/me");
  if (user.role !== "contractor") redirect("/dashboard");

  const data = await apiFetch<{
    contractor: Contractor;
    checklist: VerificationChecklistItem[];
  }>("/verification");

  return (
    <PageShell width={1160}>
      <PageHeading
        title="Verification"
        lead="Your license is checked against the state board. Verification is what makes your submissions Professional Verified — a subscription on its own does not."
      />
      <VerificationScreen
        contractor={data.contractor}
        checklist={data.checklist}
      />
    </PageShell>
  );
}
