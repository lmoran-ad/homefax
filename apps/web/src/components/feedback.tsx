"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "./buttons";

/* ---------------------------------------------------------------- toasts */

type ToastContextValue = { toast: (message: string) => void };
const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((next: string) => {
    setMessage(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3200);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <div
          role="status"
          aria-live="polite"
          className="animate-fade-up fixed bottom-7 left-1/2 z-[60] -translate-x-1/2 rounded-[999px] bg-navy px-[22px] py-[13px] text-[13.5px] font-semibold text-white"
          style={{ boxShadow: "var(--shadow-toast)" }}
        >
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

/* ---------------------------------------------------------------- modals */

export function Modal({
  open,
  onClose,
  children,
  maxWidth = 720,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
  labelledBy?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Prevent the page behind from scrolling under the overlay.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "#0b2c5299" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="animate-fade-up flex max-h-[80vh] w-full flex-col overflow-hidden rounded-[16px] bg-white"
        style={{ maxWidth }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- paywall */

export type PaywallData = {
  key: string;
  tierLabel: string;
  planLine: string;
  title: string;
  body: string;
  bullets: string[];
  cta: string;
};

export function PaywallModal({
  paywall,
  onClose,
  onUpgrade,
  busy = false,
}: {
  paywall: PaywallData | null;
  onClose: () => void;
  onUpgrade: () => void;
  busy?: boolean;
}) {
  return (
    <Modal open={Boolean(paywall)} onClose={onClose} maxWidth={520} labelledBy="paywall-title">
      {paywall ? (
        <div className="p-[30px_32px]">
          <div className="text-[11px] font-bold tracking-[0.16em] text-brand">
            {paywall.tierLabel}
          </div>
          <div className="mt-[6px] text-[13px] font-semibold text-muted">
            {paywall.planLine}
          </div>
          <h2
            id="paywall-title"
            className="mt-[14px] mb-0 text-[24px] font-extrabold tracking-[-0.02em] text-ink"
          >
            {paywall.title}
          </h2>
          <p className="mt-[10px] text-[14.5px] leading-[1.6] text-muted">
            {paywall.body}
          </p>
          <ul className="mt-[18px] mb-0 list-none space-y-[10px] p-0">
            {paywall.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-[10px] text-[14px] text-body">
                <span className="font-bold text-green">✓</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          <div className="mt-[24px] flex flex-wrap gap-[10px]">
            <Button onClick={onUpgrade} disabled={busy}>
              {busy ? "Working…" : paywall.cta}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Not now
            </Button>
          </div>
          <p className="mt-[16px] mb-0 text-[12.5px] text-faint">
            Demo checkout. No payment is collected.
          </p>
        </div>
      ) : null}
    </Modal>
  );
}
