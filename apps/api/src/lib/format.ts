const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** `2023-05-14` → `May 14, 2023`. Day precision throughout; no timezones. */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  const index = Number(month) - 1;
  return `${MONTHS[index] ?? "?"} ${Number(day)}, ${year}`;
}

export function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

/**
 * The dataset is written against a fixed reference date so the demo reads the
 * same on any day: expiry countdowns, "provisioned today" and the greeting all
 * stay stable. Set DEMO_TODAY to override, or unset DEMO_MODE for real time.
 */
export function today(): string {
  const override = process.env.DEMO_TODAY;
  if (override) return override;
  if (process.env.DEMO_MODE !== "false") return "2026-08-28";
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(iso: string, from: string = today()): number {
  const ms = Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function isPast(iso: string, from: string = today()): boolean {
  return Date.parse(`${iso}T00:00:00Z`) < Date.parse(`${from}T00:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  const ms = Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** "today at 2:41 PM" — the ledger's last-verified line. */
export function nowLabel(now: Date = new Date()): string {
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const suffix = now.getHours() >= 12 ? "PM" : "AM";
  const hour = now.getHours() % 12 || 12;
  return `today at ${hour}:${minutes} ${suffix}`;
}
