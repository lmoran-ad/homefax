import type { ReactNode } from "react";
import type {
  ClaimStateKey,
  JobStatus,
  SystemStatus,
  VerificationLevel,
} from "@hometoken/contracts";
import { CLAIM_STATE, JOB_STATUS, SYSTEM_STATUS, VERIFICATION } from "@/lib/format";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-[16px] border border-line bg-white ${padded ? "p-[22px_24px]" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function Eyebrow({
  children,
  className = "",
  color = "#8a95a1",
}: {
  children: ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <div
      className={`text-[11px] font-bold tracking-[0.16em] ${className}`}
      style={{ color }}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`m-0 text-[21px] font-extrabold tracking-[-0.02em] text-ink ${className}`}
    >
      {children}
    </h2>
  );
}

export function Pill({
  label,
  bg,
  fg,
  line,
  dot,
  className = "",
}: {
  label: string;
  bg: string;
  fg: string;
  line?: string;
  dot?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[6px] rounded-[999px] px-[10px] py-[4px] text-[11px] font-bold tracking-[0.06em] whitespace-nowrap ${className}`}
      style={{
        background: bg,
        color: fg,
        border: line ? `1px solid ${line}` : "1px solid transparent",
      }}
    >
      {dot ? (
        <span
          className="h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ background: dot }}
        />
      ) : null}
      {label}
    </span>
  );
}

export function VerificationBadge({
  level,
  className = "",
}: {
  level: VerificationLevel;
  className?: string;
}) {
  const meta = VERIFICATION[level];
  return <Pill label={meta.label} bg={meta.bg} fg={meta.fg} className={className} />;
}

export function StatusPill({ status }: { status: SystemStatus }) {
  const meta = SYSTEM_STATUS[status];
  return <Pill label={meta.label} bg={meta.bg} fg={meta.fg} dot={meta.dot} />;
}

export function JobStatusPill({ status }: { status: JobStatus }) {
  const meta = JOB_STATUS[status];
  return <Pill label={meta.label} bg={meta.bg} fg={meta.fg} line={meta.line} />;
}

export function ClaimBadge({ state }: { state: ClaimStateKey }) {
  const meta = CLAIM_STATE[state];
  return <Pill label={meta.label} bg={meta.bg} fg={meta.fg} line={meta.line} />;
}

export function Mono({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`font-mono ${className}`} style={{ fontFamily: "var(--font-mono)" }}>
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="text-[10.5px] font-bold tracking-[0.14em] text-softer">
        {label}
      </div>
      <div className="mt-[5px] truncate text-[15px] font-bold text-ink">{value}</div>
    </div>
  );
}

export function Spinner({ size = 18, color = "#1a4f9c" }: { size?: number; color?: string }) {
  return (
    <span
      className="animate-spin-slow inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}33`,
        borderTopColor: color,
      }}
      role="status"
      aria-label="Loading"
    />
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-line bg-white px-6 py-[46px] text-center">
      <div className="text-[17px] font-bold text-ink">{title}</div>
      <p className="mx-auto mt-2 max-w-[420px] text-[14px] leading-[1.6] text-muted">
        {body}
      </p>
      {action ? <div className="mt-[18px]">{action}</div> : null}
    </div>
  );
}

export function Avatar({
  initials,
  bg,
  size = 40,
}: {
  initials: string;
  bg: string;
  size?: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

/** A 34×4px red rule, used where the prototype used an icon. */
export function RedRule() {
  return <div className="mb-[18px] h-1 w-[34px] rounded-full bg-brand" />;
}
