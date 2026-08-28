"use client";

import { useEffect, useId, useRef, useState } from "react";
import { request } from "@/lib/client";

export type AddressSuggestion = {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  parcelId: string;
};

/**
 * An address box that suggests what the source actually holds.
 *
 * The county stores one spelling of every address — "6663 N CEYLON ST" — and a
 * lookup is a prefix match against it. Typing from memory produces "no record"
 * for houses that are plainly in the data, so the fix is not a cleverer
 * matcher: it is showing people the strings that exist and letting them pick
 * one.
 */
export function AddressInput({
  value,
  onChange,
  onPick,
  onSubmit,
  placeholder,
  testId,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  /** The picked suggestion, and the string written into the box. */
  onPick?: (suggestion: AddressSuggestion, formatted: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  testId?: string;
  label: string;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const listId = useId();

  // Identifies the most recent request, so a slow answer to an older prefix
  // cannot overwrite the list for what is now in the box.
  const latest = useRef(0);
  const chosen = useRef<string | null>(null);

  useEffect(() => {
    const query = value.trim();
    // Picking from the list writes into the box, which would otherwise look
    // like typing and immediately reopen the menu underneath the choice.
    if (chosen.current === query) return;
    if (query.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const ticket = ++latest.current;
    // Every keystroke would otherwise be a request to the county, and the
    // answer to a half-typed street is not worth one.
    const timer = setTimeout(() => {
      setLoading(true);
      request<{ suggestions: AddressSuggestion[] }>(
        `/properties/address-suggest?q=${encodeURIComponent(query)}`,
      )
        .then((payload) => {
          if (ticket !== latest.current) return;
          setSuggestions(payload.suggestions);
          setOpen(payload.suggestions.length > 0);
          setActive(-1);
        })
        .catch(() => {
          if (ticket !== latest.current) return;
          // A suggestion list is a convenience. Losing it must not stop
          // somebody typing an address they already know.
          setSuggestions([]);
          setOpen(false);
        })
        .finally(() => {
          if (ticket === latest.current) setLoading(false);
        });
    }, 220);

    return () => clearTimeout(timer);
  }, [value]);

  function pick(suggestion: AddressSuggestion) {
    const full = `${suggestion.address}, ${suggestion.city}, ${suggestion.postalCode}`;
    chosen.current = full.trim();
    onChange(full);
    setOpen(false);
    setSuggestions([]);
    onPick?.(suggestion, full);
  }

  return (
    <div className="relative min-w-[220px] flex-1">
      <input
        value={value}
        onChange={(event) => {
          chosen.current = null;
          onChange(event.target.value);
        }}
        onFocus={() => setOpen(suggestions.length > 0)}
        // A click on a suggestion blurs the input first, so the menu has to
        // outlive the blur long enough for the click to land.
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && suggestions.length) {
            event.preventDefault();
            setOpen(true);
            setActive((i) => (i + 1) % suggestions.length);
          } else if (event.key === "ArrowUp" && suggestions.length) {
            event.preventDefault();
            setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
          } else if (event.key === "Enter") {
            if (open && active >= 0 && suggestions[active]) {
              event.preventDefault();
              pick(suggestions[active]);
            } else {
              onSubmit?.();
            }
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        role="combobox"
        autoComplete="off"
        data-testid={testId}
        className="w-full rounded-[10px] border border-input bg-white px-4 py-[13px] text-[15px] text-ink placeholder:text-faint"
      />

      {loading && !open ? (
        <span className="absolute top-[15px] right-4 text-[12px] text-faint">
          Searching…
        </span>
      ) : null}

      {open ? (
        <ul
          id={listId}
          role="listbox"
          data-testid="address-suggestions"
          className="absolute top-[calc(100%+4px)] right-0 left-0 z-20 m-0 max-h-[280px] list-none overflow-auto rounded-[10px] border border-line bg-white p-1 shadow-[0_12px_28px_rgba(11,44,82,0.14)]"
        >
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.parcelId}-${suggestion.address}`}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                data-testid="address-suggestion"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(suggestion)}
                className={`block w-full cursor-pointer rounded-[8px] border-0 px-[12px] py-[9px] text-left ${
                  index === active ? "bg-card" : "bg-transparent"
                }`}
              >
                <span className="block text-[14px] font-semibold text-ink">
                  {suggestion.address}
                </span>
                <span className="block text-[12.5px] text-muted">
                  {suggestion.city}, {suggestion.state} {suggestion.postalCode}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
