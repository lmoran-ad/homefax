import type { ReactNode } from "react";
import Link from "next/link";
import { Mono } from "@/components/ui";
import { PropertyTabs } from "@/components/property-tabs";
import { loadProperty, loadSession } from "@/lib/property";

export const dynamic = "force-dynamic";

export default async function PropertyLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const [{ property }, user] = await Promise.all([
    loadProperty(tokenId),
    loadSession(),
  ]);

  const isOwner = user.homeTokenId === tokenId;

  return (
    <>
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1440px] px-8 pt-[18px]">
          <nav className="flex flex-wrap items-center gap-[8px] text-[13px] text-muted">
            <Link
              href={isOwner ? "/dashboard" : "/properties"}
              className="font-semibold text-link no-underline hover:text-brand"
            >
              {isOwner ? "My Home" : "Properties"}
            </Link>
            <span className="text-faint">›</span>
            <span className="font-semibold text-ink">{property.address}</span>
            <span className="text-faint">›</span>
            <Mono className="text-[12px] text-faint">{property.tokenId}</Mono>
          </nav>
          <PropertyTabs tokenId={tokenId} role={user.role} />
        </div>
      </div>
      {children}
    </>
  );
}
