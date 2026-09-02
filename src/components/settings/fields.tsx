import type { ReactNode } from "react";

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid grid-cols-[12rem_1fr] items-center gap-3 py-1 text-sm">
      <span className="text-fg-muted">{label}</span>
      <span>{children}</span>
    </label>
  );
}

export function TextField({
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      name={name}
      type={type}
      defaultValue={defaultValue ?? undefined}
      placeholder={placeholder}
      autoComplete="off"
      className="w-full max-w-md border border-border bg-bg px-2 py-1 outline-none focus:border-accent-ink"
    />
  );
}

export function SelectField({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="border border-border bg-bg px-2 py-1 outline-none focus:border-accent-ink"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ name, defaultChecked }: { name: string; defaultChecked?: boolean }) {
  return (
    <input
      name={name}
      type="checkbox"
      defaultChecked={defaultChecked}
      className="h-4 w-4 accent-[var(--accent)]"
    />
  );
}

export function SaveButton({ label = "save" }: { label?: string }) {
  return (
    <button
      type="submit"
      className="border border-accent-ink px-3 py-1 text-accent-ink hover:bg-accent-soft"
    >
      [ {label} ]
    </button>
  );
}

export function Heading({ path }: { path: string }) {
  return (
    <h1 className="mb-4 text-sm text-fg-muted">
      <span className="text-accent-ink">$</span> settings/{path}
    </h1>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-xs text-ok">&gt; {children}</p>;
}
