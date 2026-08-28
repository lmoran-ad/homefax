"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role, SessionUser } from "@homefax/contracts";
import { LogoMark } from "./brand";
import { Avatar } from "./ui";
import { request } from "@/lib/client";

type NavItem = { href: string; label: string; count?: number };

export type HeaderCounts = { saved: number; requests: number };

function navFor(user: SessionUser, counts: HeaderCounts): NavItem[] {
  const role: Role = user.role;
  if (role === "agent") {
    return [
      { href: "/dashboard", label: "Home" },
      { href: "/properties", label: "Properties" },
      { href: "/saved", label: "Saved", count: counts.saved },
    ];
  }
  if (role === "homeowner") {
    return [
      { href: "/dashboard", label: "My Homes" },
      { href: "/pros", label: "Find a Pro" },
      { href: "/inbox", label: "Requests", count: counts.requests },
    ];
  }
  return [
    { href: "/jobs", label: "Jobs" },
    { href: "/verification", label: "Verification" },
    { href: "/pros", label: "Find a Pro" },
  ];
}

/**
 * Sticky app header.
 *
 * Width here is tight and regressed repeatedly in the prototype. The rules
 * that keep it honest:
 *
 *   - the logo cluster, nav and account button are all `flex: 0 0 auto`
 *   - the spacer is the only flexible child, and carries `min-width: 0`
 *   - the account name never ellipses, so the sign-out control stays reachable
 *   - the REAL / REMAX lockup is omitted here (it is on the landing and login
 *     screens only) because it cost ~97px the homeowner nav needs
 *
 * The homeowner nav is the widest of the three; check that one first if
 * anything is added here.
 */
export function AppHeader({
  user,
  counts,
}: {
  user: SessionUser;
  counts: HeaderCounts;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function signOut() {
    setSigningOut(true);
    await request("/auth/logout", { method: "POST" }).catch(() => undefined);
    // A full navigation, so no per-session state survives into the next login.
    window.location.href = "/login";
  }

  const nav = navFor(user, counts);

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-20 border-b border-line bg-white"
    >
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-3 px-5">
        <Link
          href={user.landingRoute}
          className="flex shrink-0 items-center gap-[10px] no-underline"
        >
          <LogoMark size={30} />
          <span className="text-[18px] font-extrabold tracking-[-0.02em] text-ink">
            HomeFax
          </span>
        </Link>

        <nav data-testid="header-nav" className="flex shrink-0 items-center gap-1">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid="header-nav-item"
                data-active={active}
                className={`rounded-[8px] px-[12px] py-[8px] text-[14px] whitespace-nowrap no-underline ${
                  active
                    ? "bg-line-light font-bold text-ink"
                    : "font-semibold text-body hover:text-brand"
                }`}
              >
                {item.label}
                {item.count ? (
                  <span className="text-faint"> ({item.count})</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* The only flexible child. min-w-0 lets it collapse instead of
            pushing the account button off the edge. */}
        <div className="min-w-0 flex-auto" />

        <div
          data-testid="demo-marker"
          className="hidden shrink-0 items-center gap-[7px] sm:flex"
        >
          <span className="h-[8px] w-[8px] rounded-full bg-amber-dot" />
          <span className="text-[11.5px] font-bold tracking-[0.06em] text-amber">
            DEMO
          </span>
        </div>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            data-testid="account-button"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex cursor-pointer items-center gap-[9px] rounded-[999px] border border-line bg-white py-[5px] pr-[12px] pl-[5px] hover:border-navy"
          >
            <Avatar initials={user.initials} bg={user.avatarBg} size={36} />
            <span className="shrink-0 text-[14px] font-bold whitespace-nowrap text-ink">
              {user.name}
            </span>
            <span
              className="text-[11px] text-soft transition-transform"
              style={{ transform: menuOpen ? "rotate(180deg)" : "none" }}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>

          {menuOpen ? (
            <div
              role="menu"
              data-testid="account-menu"
              className="animate-fade-up-fast absolute top-[52px] right-0 z-40 w-[252px] rounded-[12px] border border-line bg-white p-2"
              style={{ boxShadow: "var(--shadow-menu)" }}
            >
              <div className="border-b border-line-light px-[10px] pt-[8px] pb-[12px]">
                <div className="text-[14px] font-bold text-ink">{user.name}</div>
                <div className="truncate text-[12.5px] text-muted">{user.email}</div>
                <div className="mt-[10px] flex flex-wrap gap-[6px]">
                  <span className="rounded-[999px] bg-info-bg px-[9px] py-[3px] text-[10.5px] font-bold text-link">
                    {user.planName.toUpperCase()}
                  </span>
                  <span className="rounded-[999px] bg-warn-bg px-[9px] py-[3px] text-[10.5px] font-bold text-amber">
                    DEMO DATA
                  </span>
                </div>
              </div>

              <Link
                href="/settings"
                role="menuitem"
                data-testid="account-settings-link"
                className="mt-[6px] block rounded-[8px] px-[10px] py-[9px] text-[14px] font-semibold text-body no-underline hover:bg-card hover:text-ink"
              >
                Account settings
              </Link>
              <Link
                href="/plans"
                role="menuitem"
                data-testid="plans-link"
                className="block rounded-[8px] px-[10px] py-[9px] text-[14px] font-semibold text-body no-underline hover:bg-card hover:text-ink"
              >
                Plans &amp; billing
              </Link>

              <div className="my-[6px] h-px bg-line-light" />

              <button
                type="button"
                role="menuitem"
                data-testid="sign-out-button"
                onClick={() => void signOut()}
                disabled={signingOut}
                className="w-full cursor-pointer rounded-[8px] border-0 bg-transparent px-[10px] py-[9px] text-left text-[14px] font-bold text-error hover:bg-danger-bg"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
