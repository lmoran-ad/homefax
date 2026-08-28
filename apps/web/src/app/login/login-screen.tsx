"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DemoAccount, SessionUser } from "@hometoken/contracts";
import { BrandLockup, LogoMark } from "@/components/brand";
import { Button } from "@/components/buttons";
import {
  Checkbox,
  ErrorBanner,
  PasswordField,
  TextField,
} from "@/components/fields";
import { Avatar, Pill } from "@/components/ui";
import { ClientApiError, request } from "@/lib/client";

/** All three demo accounts share this. Shown so the demo is walk-up usable. */
const DEMO_PASSWORD = "demo-password";

export function LoginScreen({
  accounts,
  initialEmail,
}: {
  accounts: DemoAccount[];
  initialEmail: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  const selected =
    accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase()) ??
    accounts[0]!;

  async function signIn() {
    if (signingIn) return;
    setSigningIn(true);
    setError("");
    try {
      const { user } = await request<{ user: SessionUser }>("/auth/login", {
        method: "POST",
        body: { email, password, keepSignedIn },
      });
      router.push(user.landingRoute);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ClientApiError
          ? caught.error.message
          : "Sign-in failed. Try again.",
      );
      setSigningIn(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      <aside className="dot-grid hidden flex-col justify-between p-[56px_64px] text-white lg:flex">
        <div className="flex items-center gap-[11px]">
          <LogoMark size={34} variant="white" />
          <span className="text-[21px] font-extrabold tracking-[-0.02em]">
            HomeToken
          </span>
          <span className="h-[18px] w-px" style={{ background: "#ffffff33" }} />
          <BrandLockup tone="white" />
        </div>

        <div>
          <h1 className="m-0 max-w-[480px] text-[42px] leading-[1.06] font-extrabold tracking-[-0.035em]">
            The record belongs to the property.
          </h1>
          <p
            className="mt-[20px] max-w-[440px] text-[16.5px] leading-[1.6]"
            style={{ color: "#ffffffcc" }}
          >
            Owners change, agents change, contractors change. The HomeToken stays
            with the parcel — permanent, append-only, and hash-chained end to end.
          </p>
        </div>

        <p className="m-0 max-w-[460px] text-[12.5px] leading-[1.6]" style={{ color: "#ffffff8a" }}>
          A HomeToken is a property record. It is not a deed, a security, or
          cryptocurrency, and it does not replace title. All demo data is fictional.
        </p>
      </aside>

      <main className="flex items-center justify-center bg-white px-6 py-[56px]">
        <div className="w-full max-w-[430px]">
          <Link
            href="/"
            className="text-[13.5px] font-bold text-link no-underline hover:text-brand"
          >
            ← Back to home
          </Link>

          <div className="mt-[26px] text-[11px] font-bold tracking-[0.16em] text-softer">
            {selected.kicker}
          </div>
          <h2 className="mt-[10px] mb-0 text-[38px] leading-[1.1] font-extrabold tracking-[-0.03em] text-ink">
            Sign in
          </h2>
          <p className="mt-[12px] mb-0 text-[14.5px] leading-[1.6] text-muted">
            {selected.blurb}
          </p>

          <form
            className="mt-[26px] space-y-[16px]"
            onSubmit={(event) => {
              event.preventDefault();
              void signIn();
            }}
          >
            {error ? <ErrorBanner>{error}</ErrorBanner> : null}

            <TextField
              label="Email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <PasswordField
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="flex items-center justify-between gap-3">
              <Checkbox
                label="Keep me signed in"
                checked={keepSignedIn}
                onChange={setKeepSignedIn}
              />
              <span className="text-[13.5px] font-semibold text-link">
                Forgot password?
              </span>
            </div>

            <Button type="submit" size="lg" full disabled={signingIn}>
              {signingIn ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-[30px] flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[11px] font-bold tracking-[0.16em] text-softer">
              DEMO ACCOUNTS
            </span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <div className="mt-[16px] space-y-[10px]">
            {accounts.map((account) => {
              const active = account.email === selected.email;
              return (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    // Fills the credentials only. Signing in stays a deliberate
                    // second action.
                    setEmail(account.email);
                    setPassword(DEMO_PASSWORD);
                    setError("");
                  }}
                  className="flex w-full cursor-pointer items-center gap-[13px] rounded-[12px] p-[12px_14px] text-left transition-colors"
                  style={{
                    border: active ? "1.5px solid #1a4f9c" : "1px solid #e3e7ec",
                    background: active ? "#f2f7fd" : "#ffffff",
                  }}
                >
                  <Avatar initials={account.initials} bg={account.avatarBg} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-bold text-ink">
                      {account.name}
                    </div>
                    <div className="truncate text-[13px] text-muted">
                      {account.roleLabel}
                    </div>
                  </div>
                  <Pill
                    label={account.badge}
                    bg={account.badgeBg}
                    fg={account.badgeFg}
                  />
                </button>
              );
            })}
          </div>

          <p className="mt-[18px] mb-0 text-[12.5px] leading-[1.6] text-faint">
            Every demo account uses the password{" "}
            <span style={{ fontFamily: "var(--font-mono)" }}>{DEMO_PASSWORD}</span>.
            Selecting an account fills the form; it does not sign you in.
          </p>
        </div>
      </main>
    </div>
  );
}
