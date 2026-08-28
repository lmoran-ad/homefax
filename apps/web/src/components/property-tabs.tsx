"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@homefax/contracts";

export function PropertyTabs({
  tokenId,
  role,
}: {
  tokenId: string;
  role: Role;
}) {
  const pathname = usePathname();
  const base = `/properties/${tokenId}`;

  const tabs: { href: string; label: string }[] = [
    { href: base, label: "Overview" },
    { href: `${base}/timeline`, label: "Timeline" },
    { href: `${base}/documents`, label: "Documents" },
    { href: `${base}/ask`, label: "Ask This Home" },
    { href: `${base}/add-record`, label: "Add Record" },
  ];

  // Transfer hands the record to the homeowner, so it is the agent's action
  // and appears only for them.
  if (role === "agent") {
    tabs.push({ href: `${base}/transfer`, label: "Transfer to owner" });
  }

  return (
    <div data-testid="property-tabs" className="-mb-px flex gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const active =
          tab.href === base ? pathname === base : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            data-testid="property-tab"
            data-active={active}
            className={`border-b-2 px-[14px] py-[14px] text-[14px] whitespace-nowrap no-underline ${
              active
                ? "border-brand font-bold text-ink"
                : "border-transparent font-semibold text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
