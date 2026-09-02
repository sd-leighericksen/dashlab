import { describe, it, expect } from "vitest";
import { accentTokens, contrastRatio, accentFg, isHexColor } from "@/lib/theme";

describe("theme", () => {
  it("derives readable accent ink in both themes", () => {
    const t = accentTokens("#f3b445");
    expect(contrastRatio(t.accentInkDark, "#131313")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.accentInkLight, "#efeeec")).toBeGreaterThanOrEqual(4.5);
  });
  it("keeps a light-friendly accent unchanged for dark ink", () => {
    const t = accentTokens("#38bdf8");
    expect(t.accentInkDark).toBe("#38bdf8");
  });
  it("picks fixed ink with best contrast for fills", () => {
    expect(accentFg("#f3b445")).toBe("#131313");
    expect(accentFg("#0b3d2e")).toBe("#efeeec");
  });
  it("validates hex", () => {
    expect(isHexColor("#f3b445")).toBe(true);
    expect(isHexColor("#fff")).toBe(true);
    expect(isHexColor("red")).toBe(false);
  });
});
