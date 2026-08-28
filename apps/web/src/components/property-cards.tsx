import Link from "next/link";
import type { PropertySummary } from "@homefax/contracts";
import { PhotoPlaceholder } from "./brand";
import { Mono } from "./ui";
import { formatMoney } from "@/lib/format";

/** 3-up card used on the dashboard's "Recent HomeFaxes" grid. */
export function PropertyCard({
  property,
  badge,
}: {
  property: PropertySummary;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={`/properties/${property.tokenId}`}
      data-testid="property-card"
      data-token-id={property.tokenId}
      className="block min-w-0 overflow-hidden rounded-[16px] border border-line bg-white no-underline transition-shadow hover:shadow-[0_8px_24px_#0b2c5214]"
    >
      <PhotoPlaceholder className="h-[150px] w-full">
        {property.isShowcase ? (
          <span className="absolute top-3 left-3 rounded-[6px] bg-brand px-[9px] py-[4px] text-[10px] font-bold tracking-[0.1em] text-white">
            SHOWCASE
          </span>
        ) : null}
      </PhotoPlaceholder>

      <div className="p-[18px_20px]">
        <div className="truncate text-[17px] font-bold tracking-[-0.015em] text-ink">
          {property.address}
        </div>
        <div className="mt-[3px] truncate text-[13.5px] text-muted">
          {property.city}, {property.state} {property.postalCode}
        </div>

        <div className="mt-[12px] flex flex-wrap items-center gap-[8px]">
          <Mono className="text-[11.5px] text-link">{property.tokenId}</Mono>
          {badge}
        </div>

        <div className="track-min-0 mt-[16px] grid grid-cols-3 gap-[10px] border-t border-line-light pt-[14px]">
          <Figure label="EST. VALUE" value={formatMoney(property.estimatedValue)} />
          <Figure
            label="HEALTH"
            value={property.healthScore === null ? "—" : `${property.healthScore} /100`}
          />
          <Figure label="EVENTS" value={String(property.eventCount)} />
        </div>
      </div>
    </Link>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] font-bold tracking-[0.12em] text-softer">
        {label}
      </div>
      <div className="mt-[4px] truncate text-[14px] font-bold text-ink">{value}</div>
    </div>
  );
}

/** Wide row used on search results. */
export function PropertyRow({
  property,
  action,
}: {
  property: PropertySummary;
  action?: React.ReactNode;
}) {
  return (
    <div
      data-testid="property-row"
      data-token-id={property.tokenId}
      className="track-min-0 grid grid-cols-[100px_minmax(0,1fr)_auto] items-center gap-[22px] rounded-[14px] border border-line bg-white p-[16px_20px]"
    >
      <Link href={`/properties/${property.tokenId}`} className="block">
        <PhotoPlaceholder className="h-[84px] w-full rounded-[10px]" label="" />
      </Link>

      <div className="min-w-0">
        <Link
          href={`/properties/${property.tokenId}`}
          className="block truncate text-[18px] font-bold tracking-[-0.015em] text-ink no-underline hover:text-brand"
        >
          {property.address}
        </Link>
        <div className="mt-[3px] truncate text-[13.5px] text-muted">
          {property.city}, {property.state} {property.postalCode}
        </div>
        <div className="mt-[8px] truncate">
          <Mono className="text-[11.5px] text-link">{property.tokenId}</Mono>
          <Mono className="text-[11.5px] text-faint"> · {property.parcelId}</Mono>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-[26px]">
        <div className="hidden text-right sm:block">
          <div className="text-[10.5px] font-bold tracking-[0.12em] text-softer">
            EST. VALUE
          </div>
          <div className="mt-[4px] text-[15px] font-bold text-ink">
            {formatMoney(property.estimatedValue)}
          </div>
        </div>
        <div className="hidden text-right md:block">
          <div className="text-[10.5px] font-bold tracking-[0.12em] text-softer">
            HEALTH
          </div>
          <div className="mt-[4px] text-[15px] font-bold text-ink">
            {property.healthScore ?? "—"}
          </div>
        </div>
        <div className="hidden text-right md:block">
          <div className="text-[10.5px] font-bold tracking-[0.12em] text-softer">
            EVENTS
          </div>
          <div className="mt-[4px] text-[15px] font-bold text-ink">
            {property.eventCount}
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}
