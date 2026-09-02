import { describe, it, expect } from "vitest";
import { appAddresses, preferredAddress } from "@/lib/content/addresses";

const urls = {
  domain: "https://x.example.com",
  tailscale: "http://100.1.1.1:80",
  local: "http://192.168.0.1:80",
};

describe("addresses", () => {
  it("puts the preferred address first", () => {
    expect(appAddresses(urls, "local")[0].type).toBe("local");
    expect(appAddresses(urls, "tailscale")[0].type).toBe("tailscale");
  });
  it("dedupes and skips missing", () => {
    const a = appAddresses({ domain: "https://x" }, "local");
    expect(a).toHaveLength(1);
    expect(a[0].type).toBe("domain");
  });
  it("preferredAddress returns first or null", () => {
    expect(preferredAddress(urls, "domain")?.label).toBe("dom");
    expect(preferredAddress({}, "domain")).toBeNull();
  });
});
