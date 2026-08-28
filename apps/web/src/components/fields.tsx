"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-[7px] block text-[12px] font-bold tracking-[0.02em] text-body"
    >
      {children}
    </label>
  );
}

const INPUT_CLASS =
  "w-full rounded-[10px] border border-input bg-white px-4 py-[14px] text-[15px] text-ink placeholder:text-faint disabled:bg-card disabled:text-faint";

export function TextField({
  label,
  hint,
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  const id = useId();
  return (
    <div className={className}>
      {label ? <FieldLabel htmlFor={id}>{label}</FieldLabel> : null}
      <input id={id} className={INPUT_CLASS} {...rest} />
      {hint ? <p className="mt-[6px] text-[12.5px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function TextArea({
  label,
  rows = 4,
  className = "",
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const id = useId();
  return (
    <div className={className}>
      {label ? <FieldLabel htmlFor={id}>{label}</FieldLabel> : null}
      <textarea id={id} rows={rows} className={`${INPUT_CLASS} resize-y`} {...rest} />
    </div>
  );
}

export function SelectField({
  label,
  options,
  className = "",
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <div className={className}>
      {label ? <FieldLabel htmlFor={id}>{label}</FieldLabel> : null}
      <select id={id} className={INPUT_CLASS} {...rest}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Password field with the inline SHOW/HIDE toggle. */
export function PasswordField({
  label,
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className={className}>
      {label ? <FieldLabel htmlFor={id}>{label}</FieldLabel> : null}
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={`${INPUT_CLASS} pr-[64px]`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer border-0 bg-transparent text-[12px] font-semibold tracking-[0.04em] text-soft"
        >
          {visible ? "HIDE" : "SHOW"}
        </button>
      </div>
    </div>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  className = "",
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`flex items-start gap-[10px] ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-[2px] h-[16px] w-[16px] shrink-0 cursor-pointer"
        style={{ accentColor: "#1a4f9c" }}
      />
      <label htmlFor={id} className="cursor-pointer text-[13.5px] leading-[1.5] text-body">
        {label}
      </label>
    </div>
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-[10px] border border-danger-line bg-danger-bg px-4 py-3 text-[13.5px] leading-[1.5] text-error"
    >
      {children}
    </div>
  );
}

export function FilterPills({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-[8px]">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`cursor-pointer rounded-[999px] border px-[13px] py-[7px] text-[13px] whitespace-nowrap transition-colors ${
              active
                ? "border-navy bg-navy font-bold text-white"
                : "border-line bg-white font-semibold text-body hover:border-navy"
            }`}
          >
            {option.label}
            {option.count === undefined ? null : (
              <span className={active ? "text-white/60" : "text-faint"}>
                {" "}
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
