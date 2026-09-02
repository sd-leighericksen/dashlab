import { requirePage } from "@/lib/auth/guard";
import { Credit } from "@/components/ui/Credit";

const NAV: { href: string; label: string; branch: string }[] = [
  { href: "/settings/general", label: "general", branch: "├──" },
  { href: "/settings/users", label: "users", branch: "├──" },
  { href: "/settings/dashboards", label: "dashboards", branch: "├──" },
  { href: "/settings/categories", label: "categories", branch: "├──" },
  { href: "/settings/content", label: "content", branch: "├──" },
  { href: "/settings/integrations", label: "integrations", branch: "├──" },
  { href: "/settings/api-keys", label: "api-keys", branch: "└──" },
];

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePage("admin");
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col gap-6 md:flex-row">
        <nav className="shrink-0 text-sm md:w-56">
          <a href="/" className="text-accent-ink">
            dashlab/
          </a>
          <ul className="mt-1">
            {NAV.map((n) => (
              <li key={n.href} className="text-fg-muted">
                <span className="text-fg-faint">{n.branch}</span>{" "}
                <a href={n.href} className="hover:text-accent-ink">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <a href="/account" className="mt-4 block text-xs text-fg-muted hover:text-accent-ink">
            [account]
          </a>
        </nav>
        <section className="min-w-0 flex-1">{children}</section>
      </div>
      <Credit className="mt-10 border-t border-border pt-4" />
    </div>
  );
}
