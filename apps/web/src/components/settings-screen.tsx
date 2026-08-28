"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionUser, Subscription } from "@hometoken/contracts";
import { Button, ButtonLink } from "./buttons";
import { ErrorBanner, PasswordField, TextField } from "./fields";
import { Modal, useToast } from "./feedback";
import { Avatar, Pill } from "./ui";
import { ClientApiError, request } from "@/lib/client";

const STATUS_CHIP = {
  ACTIVE: { bg: "#e7f4ec", fg: "#12693b" },
  "CANCELS SOON": { bg: "#fdf3e2", fg: "#8a5a06" },
  FREE: { bg: "#eef1f4", fg: "#6b7580" },
} as const;

export function SettingsScreen({
  user,
  subscription,
}: {
  user: SessionUser;
  subscription: Subscription;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
  });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

  async function saveProfile() {
    setProfileBusy(true);
    setProfileError("");
    try {
      await request("/auth/profile", {
        method: "PATCH",
        body: { ...profile, phone: profile.phone || null },
      });
      toast("Profile saved.");
      router.refresh();
    } catch (error) {
      setProfileError(
        error instanceof ClientApiError
          ? error.error.message
          : "Your profile could not be saved.",
      );
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword() {
    setPasswordBusy(true);
    setPasswordError("");
    try {
      await request("/auth/password", { method: "POST", body: password });
      toast("Password changed.");
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setPasswordError(
        error instanceof ClientApiError
          ? error.error.message
          : "Your password could not be changed.",
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  async function cancel() {
    setCancelBusy(true);
    try {
      await request("/billing/cancel", { method: "POST" });
      toast("Subscription cancelled. Your record is unaffected.");
      setCancelOpen(false);
      router.refresh();
    } finally {
      setCancelBusy(false);
    }
  }

  async function signOut() {
    await request("/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/login";
  }

  const chip = STATUS_CHIP[subscription.status];

  return (
    <div className="track-min-0 grid items-start gap-[22px] lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.9fr)]">
      <div className="min-w-0 space-y-[22px]">
        <section className="rounded-[16px] border border-line bg-white p-[26px_28px]">
          <div className="flex flex-wrap items-center gap-[14px]">
            <Avatar initials={user.initials} bg={user.avatarBg} size={56} />
            <div className="min-w-0">
              <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.02em] text-ink">
                {user.name}
              </h2>
              <div className="mt-[3px] text-[13.5px] text-muted">
                {user.roleLabel}
              </div>
            </div>
          </div>

          {profileError ? (
            <div className="mt-[18px]">
              <ErrorBanner>{profileError}</ErrorBanner>
            </div>
          ) : null}

          <div className="mt-[22px] grid gap-[16px] sm:grid-cols-2">
            <TextField
              label="Full name"
              value={profile.name}
              onChange={(event) =>
                setProfile((p) => ({ ...p, name: event.target.value }))
              }
            />
            <TextField
              label="Email"
              type="email"
              value={profile.email}
              onChange={(event) =>
                setProfile((p) => ({ ...p, email: event.target.value }))
              }
            />
            <TextField
              label="Phone"
              value={profile.phone}
              onChange={(event) =>
                setProfile((p) => ({ ...p, phone: event.target.value }))
              }
            />
            <TextField label="Role" value={user.roleLabel} disabled />
          </div>

          <div className="mt-[22px]">
            <Button onClick={() => void saveProfile()} disabled={profileBusy}>
              {profileBusy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </section>

        <section className="rounded-[16px] border border-line bg-white p-[26px_28px]">
          <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Change password
          </h2>

          {passwordError ? (
            <div className="mt-[18px]">
              <ErrorBanner>{passwordError}</ErrorBanner>
            </div>
          ) : null}

          <div className="mt-[20px] grid gap-[16px] sm:grid-cols-2">
            <PasswordField
              className="sm:col-span-2"
              label="Current password"
              autoComplete="current-password"
              value={password.currentPassword}
              onChange={(event) =>
                setPassword((p) => ({ ...p, currentPassword: event.target.value }))
              }
            />
            <PasswordField
              label="New password"
              autoComplete="new-password"
              value={password.newPassword}
              onChange={(event) =>
                setPassword((p) => ({ ...p, newPassword: event.target.value }))
              }
            />
            <PasswordField
              label="Confirm new password"
              autoComplete="new-password"
              value={password.confirmPassword}
              onChange={(event) =>
                setPassword((p) => ({ ...p, confirmPassword: event.target.value }))
              }
            />
          </div>

          <div className="mt-[22px]">
            <Button
              variant="outline"
              onClick={() => void changePassword()}
              disabled={passwordBusy}
            >
              {passwordBusy ? "Changing…" : "Change password"}
            </Button>
          </div>
        </section>
      </div>

      <aside className="min-w-0 space-y-[18px]">
        <section className="rounded-[16px] border border-line bg-white p-[22px_24px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
              Subscription
            </h3>
            <Pill label={subscription.status} bg={chip.bg} fg={chip.fg} />
          </div>

          <div className="mt-[16px] text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            {subscription.planName}
          </div>
          <div className="mt-[3px] text-[13.5px] text-muted">
            {subscription.price}
          </div>

          <dl className="mt-[16px] mb-0 space-y-[8px] border-t border-line-light pt-[14px]">
            {[
              ["Billing cycle", subscription.cycle],
              subscription.renewsOn ? ["Renews", subscription.renewsOn] : null,
              subscription.accessEndsOn
                ? ["Access ends", subscription.accessEndsOn]
                : null,
              ["Payment method", subscription.paymentMethod ?? "None on file"],
            ]
              .filter((row): row is [string, string] => row !== null)
              .map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 text-[13px]">
                  <dt className="text-muted">{label}</dt>
                  <dd className="m-0 font-semibold text-ink capitalize">{value}</dd>
                </div>
              ))}
          </dl>

          <div className="mt-[18px] space-y-[8px]">
            <ButtonLink href="/plans" variant="outline" size="sm" full>
              View plans
            </ButtonLink>
            {subscription.status === "ACTIVE" ? (
              <Button
                variant="danger"
                size="sm"
                full
                onClick={() => setCancelOpen(true)}
              >
                Cancel subscription
              </Button>
            ) : null}
          </div>
        </section>

        <section className="rounded-[16px] border border-line bg-white p-[22px_24px]">
          <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
            Sessions
          </h3>
          <p className="mt-[10px] mb-[14px] text-[13px] leading-[1.6] text-muted">
            Signed in on this device.
          </p>
          <Button variant="outline" size="sm" full onClick={() => void signOut()}>
            Sign out
          </Button>
        </section>

        <section className="rounded-[16px] border border-line bg-card p-[22px_24px]">
          <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
            Your record, if you cancel
          </h3>
          <p className="mt-[10px] mb-0 text-[13px] leading-[1.6] text-muted">
            Cancelling ends the paid features. The record, its events and its
            documents remain exactly as they are — they belong to the property, not
            to the subscription that happened to be paying when they were added.
          </p>
        </section>
      </aside>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        maxWidth={480}
        labelledBy="cancel-title"
      >
        <div className="p-[26px_28px]">
          <h2
            id="cancel-title"
            className="m-0 text-[21px] font-extrabold tracking-[-0.02em] text-ink"
          >
            Cancel {subscription.planName}?
          </h2>
          <p className="mt-[12px] mb-0 text-[14px] leading-[1.6] text-muted">
            Your plan stays active until the end of the current billing period. After
            that the paid features switch off.
          </p>

          <div className="mt-[18px] rounded-[12px] bg-card p-[16px_18px] text-[13.5px] leading-[1.6] text-body">
            Your HomeToken record is unaffected. Every event, document and hash stays
            exactly where it is — the record belongs to the property.
          </div>

          <div className="mt-[22px] flex flex-wrap gap-[10px]">
            <Button variant="danger" onClick={() => void cancel()} disabled={cancelBusy}>
              {cancelBusy ? "Cancelling…" : "Cancel subscription"}
            </Button>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep it
            </Button>
          </div>
        </div>
      </Modal>

      <Link href="/plans" className="hidden" aria-hidden="true">
        Plans
      </Link>
    </div>
  );
}
