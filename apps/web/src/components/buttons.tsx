"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type Variant = "primary" | "navy" | "outline" | "ghost" | "green" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-white border border-transparent hover:bg-brand-hover disabled:bg-brand/50",
  navy: "bg-navy text-white border border-transparent hover:bg-navy-alt disabled:bg-navy/50",
  outline:
    "bg-white text-ink border border-input hover:border-navy hover:text-navy disabled:text-faint",
  ghost: "bg-transparent text-body border border-transparent hover:text-brand",
  green:
    "bg-green text-white border border-transparent hover:bg-[#0f5730] disabled:bg-green/50",
  danger:
    "bg-white text-error border border-danger-line hover:bg-danger-bg disabled:text-faint",
};

const SIZES: Record<Size, string> = {
  sm: "px-[13px] py-[8px] text-[13px] rounded-[8px]",
  md: "px-[18px] py-[11px] text-[14px] rounded-[9px]",
  lg: "px-[26px] py-[16px] text-[15.5px] rounded-[10px]",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={`inline-flex cursor-pointer items-center justify-center gap-2 font-bold whitespace-nowrap transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  full = false,
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  full?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap no-underline transition-colors ${VARIANTS[variant]} ${SIZES[size]} ${full ? "w-full" : ""} ${className}`}
    >
      {children}
    </Link>
  );
}
