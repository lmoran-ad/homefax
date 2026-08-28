import Link from "next/link";
import type { PlanCard } from "@homefax/contracts";
import { BrandLockup, LogoMark } from "@/components/brand";
import { ButtonLink } from "@/components/buttons";
import { Eyebrow, VerificationBadge } from "@/components/ui";
import { PlanGrid, VerifiedConditionApiPanel } from "@/components/plans";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type PropertyDetail = {
  events: {
    id: string;
    occurredAt: string;
    title: string;
    meta: string;
    eventHash: string;
  }[];
};

const PILLARS = [
  {
    title: "The record belongs to the property",
    body: "Owners change, agents change, contractors change. The HomeFax stays with the parcel, so the next buyer inherits the history rather than starting from an empty folder.",
  },
  {
    title: "Append-only, and tamper-evident",
    body: "Nothing is ever overwritten. Every event is hash-chained with SHA-256, so a record that has been altered after the fact can be detected rather than trusted.",
  },
  {
    title: "Every entry says where it came from",
    body: "County data, a licensed contractor's invoice, or something the owner typed — each event carries its verification level, so you can weigh it for what it is.",
  },
];

const STEPS = [
  {
    title: "The county provides the record",
    body: "Assessor and recorder data is public and bulk-available. A HomeFax is pre-provisioned for the parcel before anyone asks for it.",
  },
  {
    title: "An agent or owner claims it",
    body: "Claiming is authorization over a record that already exists — by MLS listing, seller consent, title at closing, or a county deed match.",
  },
  {
    title: "Verified sources contribute",
    body: "Licensed contractors submit the work they performed. The homeowner accepts or declines; nobody edits what is already there.",
  },
  {
    title: "It transfers with the home",
    body: "At close, stewardship moves to the new owner. The history is retained in full. This is a record transfer, never a deed.",
  },
];

const ROLES = [
  {
    kicker: "FOR AGENTS",
    name: "Alex Morgan",
    initials: "AM",
    color: "#0b2c52",
    title: "Compile a listing-ready record",
    bullets: [
      "Claim stewardship by MLS, seller consent or title",
      "Ask grounded questions about any home in your book",
      "Export a buyer-ready report with a ledger attestation",
    ],
    email: "agent@homefax.demo",
    primary: true,
  },
  {
    kicker: "FOR HOMEOWNERS",
    name: "Dana Whitfield",
    initials: "DW",
    color: "#12693b",
    title: "Own your home's history",
    bullets: [
      "See Home Health and what every system is based on",
      "Find contractors whose licenses are actually verified",
      "Approve or decline everything before it enters the record",
    ],
    email: "owner@homefax.demo",
    primary: false,
  },
  {
    kicker: "FOR CONTRACTORS",
    name: "Marcus Vale",
    initials: "MV",
    color: "#8a5a06",
    title: "Stay attached to your work",
    bullets: [
      "Submit completed work straight to an address",
      "Carry Professional Verified status on every record",
      "The next owner sees who did the work, and when",
    ],
    email: "summit@homefax.demo",
    primary: false,
  },
];

const NOT = [
  "Not a deed, and not a substitute for one. Legal ownership stays governed by title.",
  "Not a security, a token you can trade, or cryptocurrency of any kind.",
  "Not an appraisal. The estimated value is informational.",
  "Not an inspection or a warranty. Home Health reflects only what the record contains.",
];

export default async function LandingPage() {
  const [{ property }, { plans }] = await Promise.all([
    apiFetch<{ property: PropertyDetail }>("/properties/HF-US-CO-DEN-00001234"),
    apiFetch<{ plans: PlanCard[] }>("/plans"),
  ]);

  // Four real events from the seeded showcase record, so the hero shows the
  // actual product rather than invented marketing copy.
  const timeline = property.events
    .filter((e) => e.meta)
    .slice(0, 4)
    .reverse();
  const latestHash = property.events[0]?.eventHash ?? "";

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-line backdrop-blur-[8px]" style={{ background: "#ffffffee" }}>
        <div className="mx-auto flex h-[70px] max-w-[1180px] items-center gap-4 px-6">
          <div className="flex shrink-0 items-center gap-[11px]">
            <LogoMark size={30} />
            <span className="text-[19px] font-extrabold tracking-[-0.02em]">
              HomeFax
            </span>
            <span className="hidden h-[18px] w-px bg-line sm:block" />
            <span className="hidden sm:block">
              <BrandLockup />
            </span>
          </div>
          <div className="min-w-[8px] flex-1" />
          <nav className="hidden shrink-0 items-center gap-1 md:flex">
            {[
              ["#how", "How it works"],
              ["#roles", "Who it's for"],
              ["#pricing", "Plans"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-[8px] px-[13px] py-[9px] text-[14px] font-semibold whitespace-nowrap text-body hover:text-brand"
              >
                {label}
              </a>
            ))}
          </nav>
          <ButtonLink href="/login" size="md" className="shrink-0" testId="landing-sign-in">
            Sign in
          </ButtonLink>
        </div>
      </header>

      <section className="dot-grid text-white">
        <div className="mx-auto grid max-w-[1180px] grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-[56px] px-6 pt-[88px] pb-[96px]">
          <div>
            <div
              className="mb-[26px] inline-flex items-center gap-2 rounded-[999px] px-[14px] py-[7px] text-[12.5px] font-bold tracking-[0.04em]"
              style={{ background: "#ffffff14", border: "1px solid #ffffff2b" }}
            >
              <span className="h-[7px] w-[7px] rounded-full bg-brand" />
              REAL / REMAX PROPERTY RECORD
            </div>
            <h1 className="m-0 text-[clamp(38px,6vw,58px)] leading-[1.03] font-extrabold tracking-[-0.035em]">
              The digital identity of real estate.
            </h1>
            <p
              className="mt-[22px] max-w-[560px] text-[19px] leading-[1.55]"
              style={{ color: "#ffffffcc" }}
            >
              Cars have VINs. Homes have an address and a filing cabinet. HomeFax
              gives every property one permanent, append-only record of what was
              built, repaired, inspected, permitted and paid for.
            </p>
            <div className="mt-[32px] flex flex-wrap gap-3">
              <ButtonLink href="/login" size="lg">
                Explore the demo
              </ButtonLink>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-[10px] px-[26px] py-[16px] text-[15.5px] font-bold text-white no-underline hover:text-white"
                style={{ background: "#ffffff14", border: "1px solid #ffffff33" }}
              >
                See plans
              </a>
            </div>
          </div>

          <div
            className="rounded-[18px] p-[26px_28px]"
            style={{ background: "#ffffff0f", border: "1px solid #ffffff26" }}
          >
            <Eyebrow color="#ffffff8a">123 MAIN STREET · DENVER, CO</Eyebrow>
            <div className="mt-[18px] space-y-0">
              {timeline.map((event, index) => (
                <div key={event.id} className="flex gap-[14px]">
                  <div className="flex shrink-0 flex-col items-center">
                    <span className="mt-[5px] h-[9px] w-[9px] rounded-full bg-brand" />
                    {index < timeline.length - 1 ? (
                      <span className="w-px flex-1" style={{ background: "#ffffff2b" }} />
                    ) : null}
                  </div>
                  <div className={index < timeline.length - 1 ? "pb-[18px]" : ""}>
                    <div className="text-[12px]" style={{ color: "#ffffff8a" }}>
                      {formatDate(event.occurredAt)}
                    </div>
                    <div className="mt-[3px] text-[15px] font-bold">{event.title}</div>
                    <div className="mt-[2px] text-[13px]" style={{ color: "#ffffffb0" }}>
                      {event.meta}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div
              className="mt-[6px] border-t pt-[14px] text-[10.5px] break-all"
              style={{
                borderColor: "#ffffff1f",
                color: "#ffffff7a",
                fontFamily: "var(--font-mono)",
              }}
            >
              sha256 {latestHash.slice(0, 48)}…
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 pt-[80px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[18px]">
          {PILLARS.map((pillar) => (
            <article
              key={pillar.title}
              className="rounded-[16px] border border-line bg-white p-[26px_28px]"
            >
              <div className="mb-[18px] h-1 w-[34px] rounded-full bg-brand" />
              <h3 className="m-0 text-[18.5px] font-extrabold tracking-[-0.015em] text-ink">
                {pillar.title}
              </h3>
              <p className="mt-[10px] mb-0 text-[14.5px] leading-[1.6] text-muted">
                {pillar.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-[1180px] px-6 pt-[80px]">
        <Eyebrow>HOW IT WORKS</Eyebrow>
        <h2 className="mt-[12px] mb-[26px] text-[clamp(26px,3.4vw,30px)] font-extrabold tracking-[-0.03em]">
          Nobody creates a HomeFax. They claim one.
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[18px]">
          {STEPS.map((step, index) => (
            <article
              key={step.title}
              className="rounded-[16px] border border-line bg-white p-[24px_26px]"
            >
              <div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-navy text-[13.5px] font-extrabold text-white">
                {index + 1}
              </div>
              <h3 className="mt-[16px] mb-0 text-[16px] font-bold tracking-[-0.015em] text-ink">
                {step.title}
              </h3>
              <p className="mt-[8px] mb-0 text-[14px] leading-[1.6] text-muted">
                {step.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-[22px] flex flex-wrap items-center gap-[10px] rounded-[16px] border border-line bg-white p-[20px_24px]">
          <span className="mr-2 text-[12px] font-bold tracking-[0.14em] text-softer">
            EVERY EVENT IS LABELLED
          </span>
          <VerificationBadge level="SOURCE_VERIFIED" />
          <VerificationBadge level="PROFESSIONAL_VERIFIED" />
          <VerificationBadge level="OWNER_REPORTED" />
          <VerificationBadge level="AI_EXTRACTED_PENDING" />
          <VerificationBadge level="UNVERIFIED" />
        </div>
      </section>

      <section id="roles" className="mx-auto max-w-[1180px] px-6 pt-[80px]">
        <Eyebrow>WHO IT&apos;S FOR</Eyebrow>
        <h2 className="mt-[12px] mb-[26px] text-[clamp(26px,3.4vw,30px)] font-extrabold tracking-[-0.03em]">
          Three roles, one shared record.
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-[18px]">
          {ROLES.map((role) => (
            <article
              key={role.email}
              className="flex flex-col rounded-[16px] bg-white p-[26px_28px]"
              style={{
                border: role.primary ? "1.5px solid #e4002b" : "1px solid #e3e7ec",
              }}
            >
              <div
                className="flex h-[40px] w-[40px] items-center justify-center rounded-full text-[14px] font-bold text-white"
                style={{ background: role.color }}
              >
                {role.initials}
              </div>
              <div className="mt-[16px] text-[11px] font-bold tracking-[0.14em] text-softer">
                {role.kicker}
              </div>
              <h3 className="mt-[8px] mb-0 text-[18.5px] font-extrabold tracking-[-0.015em] text-ink">
                {role.title}
              </h3>
              <ul className="mt-[14px] mb-0 list-none space-y-[9px] p-0">
                {role.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-[10px] text-[14px] leading-[1.5] text-body">
                    <span className="font-bold text-green">✓</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <div className="flex-1" />
              <Link
                href={`/login?account=${encodeURIComponent(role.email)}`}
                data-testid="landing-role-cta"
                data-account={role.email}
                className="mt-[22px] block rounded-[9px] border border-input px-4 py-[11px] text-center text-[14px] font-bold text-ink no-underline hover:border-navy hover:text-navy"
              >
                Sign in as {role.name.split(" ")[0]}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-[1180px] px-6 pt-[80px]">
        <Eyebrow>PLANS</Eyebrow>
        <h2 className="mt-[12px] mb-[26px] text-[clamp(26px,3.4vw,30px)] font-extrabold tracking-[-0.03em]">
          Priced for the side of the market that benefits.
        </h2>
        <PlanGrid plans={plans} cycle="monthly" />
        <div className="mt-[22px]">
          <VerifiedConditionApiPanel />
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 pt-[80px]">
        <div className="rounded-[16px] border border-line bg-white p-[28px_30px]">
          <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.02em] text-ink">
            What a HomeFax is not
          </h2>
          <ul className="mt-[16px] mb-0 list-none space-y-[11px] p-0">
            {NOT.map((item) => (
              <li key={item} className="flex gap-[12px] text-[14.5px] leading-[1.6] text-body">
                <span className="font-bold text-error">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 pt-[80px] pb-[70px]">
        <div className="rounded-[18px] p-[52px_44px] text-center" style={{ background: "#12395f" }}>
          <h2 className="m-0 text-[clamp(26px,4vw,36px)] font-extrabold tracking-[-0.03em] text-white">
            The owner changes. The agent changes.
            <br />
            The HomeFax remains.
          </h2>
          <p className="mx-auto mt-[16px] max-w-[560px] text-[16px] leading-[1.6]" style={{ color: "#ffffffcc" }}>
            Sign in with one of three demo accounts and walk the record end to end.
          </p>
          <div className="mt-[26px] flex justify-center">
            <ButtonLink href="/login" size="lg">
              Explore the demo
            </ButtonLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-6 py-[26px] text-[12.5px] text-muted">
          <span>
            Demo data. All addresses, names, licenses and figures are fictional.
          </span>
          <span>HomeFax is a property record, not a deed or a security.</span>
        </div>
      </footer>
    </div>
  );
}
