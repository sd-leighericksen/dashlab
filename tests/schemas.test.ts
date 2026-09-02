import { describe, it, expect } from "vitest";
import { serviceSchema } from "@/lib/content/schemas/service";
import { externalSchema } from "@/lib/content/schemas/external";
import { slugify } from "@/lib/crypto/random";

describe("service schema", () => {
  it("accepts a valid service", () => {
    const r = serviceSchema.safeParse({
      name: "Booklore",
      urls: { local: "http://192.168.0.1:3001" },
    });
    expect(r.success).toBe(true);
  });
  it("requires at least one url unless planned", () => {
    expect(serviceSchema.safeParse({ name: "X", urls: {} }).success).toBe(false);
    expect(serviceSchema.safeParse({ name: "X", status: "planned", urls: {} }).success).toBe(true);
  });
  it("rejects a bad url", () => {
    expect(serviceSchema.safeParse({ name: "X", urls: { local: "nope" } }).success).toBe(false);
  });
});

describe("external schema", () => {
  it("defaults billing-free ok", () => {
    const r = externalSchema.safeParse({ name: "BB", url: "https://b.co" });
    expect(r.success).toBe(true);
  });
});

describe("slugify", () => {
  it("kebab-cases", () => {
    expect(slugify("Nimbus Goku!")).toBe("nimbus-goku");
    expect(slugify("  Multiple   Spaces  ")).toBe("multiple-spaces");
  });
});
