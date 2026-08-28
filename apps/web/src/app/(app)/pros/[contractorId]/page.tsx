import Link from "next/link";
import type { ContractorProfile } from "@homefax/contracts";
import { PageShell } from "@/components/page-shell";
import { Mono, Pill } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ContractorPage({
  params,
}: {
  params: Promise<{ contractorId: string }>;
}) {
  const { contractorId } = await params;
  const { contractor } = await apiFetch<{ contractor: ContractorProfile }>(
    `/contractors/${contractorId}`,
  );

  return (
    <PageShell width={1160}>
      <Link
        href="/pros"
        className="text-[13.5px] font-bold text-link no-underline hover:text-brand"
      >
        ← Find a Pro
      </Link>

      <div className="track-min-0 mt-[20px] grid items-start gap-[22px] lg:grid-cols-[minmax(0,1.6fr)_minmax(270px,0.85fr)]">
        <div className="min-w-0">
          <div className="rounded-[16px] border border-line bg-white p-[26px_28px]">
            <div className="flex flex-wrap items-start gap-[16px]">
              <div
                className="flex h-[56px] w-[56px] items-center justify-center rounded-[14px] bg-card text-[19px] font-bold text-navy"
                aria-hidden="true"
              >
                {contractor.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-[10px]">
                  <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.03em] text-ink">
                    {contractor.name}
                  </h1>
                  <Pill
                    label={contractor.verified ? "VERIFIED SOURCE" : "UNVERIFIED"}
                    bg={contractor.verified ? "#e7f4ec" : "#eef1f4"}
                    fg={contractor.verified ? "#12693b" : "#6b7580"}
                  />
                </div>
                <div className="mt-[5px] text-[14px] text-muted">
                  {contractor.trade} · {contractor.area}
                </div>
              </div>
            </div>

            <p className="mt-[18px] mb-0 max-w-[620px] text-[14.5px] leading-[1.6] text-body">
              {contractor.blurb}
            </p>

            <div className="track-min-0 mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-[16px] border-t border-line-light pt-[18px]">
              {[
                ["LICENSE", contractor.license],
                ["JOBS RECORDED", String(contractor.jobCount)],
                ["ON THIS HOME", String(contractor.recordsOnThisHome)],
                ["CONTACT", contractor.phone],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <div className="text-[10.5px] font-bold tracking-[0.12em] text-softer">
                    {label}
                  </div>
                  <div
                    className="mt-[5px] truncate text-[14.5px] font-bold"
                    style={{
                      color:
                        label === "LICENSE" && !contractor.verified
                          ? "#a8102a"
                          : "#12222f",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <section className="mt-[22px] rounded-[16px] border border-line bg-white p-[26px_28px]">
            <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
              Work recorded on HomeFax
            </h2>
            <p className="mt-[8px] mb-[18px] text-[13.5px] leading-[1.6] text-muted">
              Matched by company name across every property. Shown by ZIP only —
              a contractor&apos;s track record is theirs to show; the addresses of the
              homes they worked on are not.
            </p>

            {contractor.work.length === 0 ? (
              <p className="m-0 text-[14px] text-faint">
                No work recorded on a HomeFax yet.
              </p>
            ) : (
              <div className="space-y-[10px]">
                {contractor.work.map((row) => (
                  <div
                    key={row.eventId}
                    className="flex flex-wrap items-center gap-x-[16px] gap-y-[4px] rounded-[12px] bg-card p-[14px_16px]"
                  >
                    <div className="shrink-0 text-[12.5px] font-semibold text-muted">
                      {formatDate(row.occurredAt)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14.5px] font-bold text-ink">
                        {row.title}
                      </div>
                      <div className="mt-[2px] truncate text-[12.5px] text-muted">
                        {row.meta}
                      </div>
                    </div>
                    <Mono className="shrink-0 text-[12px] text-faint">
                      ZIP {row.postalCode}
                    </Mono>
                    {row.onThisHome ? (
                      <Pill label="YOUR HOME" bg="#e8f0fb" fg="#1a4f9c" />
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-[18px]">
          <div className="rounded-[16px] border border-line bg-white p-[22px_24px]">
            <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
              Verification checklist
            </h3>
            <ul className="mt-[14px] mb-0 list-none space-y-[10px] p-0">
              {[
                ["Trade license on file", contractor.verified],
                ["Business entity registered", true],
                ["Liability insurance", contractor.verified],
                ["Listed in Find a Pro", true],
              ].map(([label, done]) => (
                <li
                  key={String(label)}
                  className="flex gap-[10px] text-[13.5px] leading-[1.5] text-body"
                >
                  <span
                    className="font-bold"
                    style={{ color: done ? "#12693b" : "#9aa5b1" }}
                  >
                    {done ? "✓" : "—"}
                  </span>
                  <span style={{ color: done ? "#3d4a57" : "#9aa5b1" }}>{label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-[14px] border-t border-line-light pt-[12px] text-[12.5px] text-muted">
              {contractor.since}
            </div>
          </div>

          <div className="rounded-[16px] border border-line bg-card p-[22px_24px]">
            <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
              What verification does and does not mean
            </h3>
            <p className="mt-[10px] mb-0 text-[13px] leading-[1.6] text-muted">
              It means a trade license is on file and checks out against the state
              board. That is all it means.
            </p>
            <p className="mt-[10px] mb-0 text-[13px] leading-[1.6] text-muted">
              It is not an endorsement, a warranty, or a rating of the quality of
              their work. HomeFax records who did what and when — it does not
              vouch for how well.
            </p>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
