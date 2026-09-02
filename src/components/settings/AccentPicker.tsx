"use client";
import { useState } from "react";

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function AccentPicker({
  name,
  defaultValue,
  fallback,
  clearable = false,
}: {
  name: string;
  defaultValue?: string | null;
  fallback: string; // colour shown in the picker when no value is set
  clearable?: boolean;
}) {
  const [value, setValue] = useState<string>(defaultValue ?? "");
  const swatch = HEX.test(value) ? value : fallback;

  return (
    <span className="flex flex-wrap items-center gap-2">
      <input type="hidden" name={name} value={value} />
      <input
        type="color"
        aria-label={`${name} colour picker`}
        value={swatch}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-10 cursor-pointer border border-border bg-bg p-0.5"
      />
      <input
        type="text"
        aria-label={`${name} hex`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={clearable ? "(site default)" : "#f3b445"}
        className="w-28 border border-border bg-bg px-2 py-1 font-mono outline-none focus:border-accent-ink"
      />
      {clearable && value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          className="text-xs text-fg-muted hover:text-accent-ink"
        >
          [site default]
        </button>
      ) : null}
      {value && !HEX.test(value) ? (
        <span className="text-xs text-err">! not a hex colour</span>
      ) : null}
    </span>
  );
}
