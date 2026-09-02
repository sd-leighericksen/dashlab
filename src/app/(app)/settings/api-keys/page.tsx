import { requirePage } from "@/lib/auth/guard";
import { listApiKeys } from "@/lib/auth/api-keys";
import { listUsers } from "@/lib/users";
import { getEnv } from "@/lib/env";
import { Heading } from "@/components/settings/fields";
import { IssueKeyForm } from "@/components/settings/IssueKeyForm";
import { API_GROUPS, MCP_TOOLS } from "@/lib/api/endpoints";
import { revokeKeyAction } from "./actions";

const METHOD_COLOR: Record<string, string> = {
  GET: "text-ok",
  POST: "text-accent-ink",
  PUT: "text-warn",
  PATCH: "text-warn",
  DELETE: "text-err",
};
function methodColor(m: string): string {
  return METHOD_COLOR[m.split("/")[0]] ?? "text-fg-muted";
}

export const dynamic = "force-dynamic";

export default async function ApiKeysSettings() {
  await requirePage("superuser");
  const [keys, users] = await Promise.all([listApiKeys(), listUsers()]);
  const byId = new Map(users.map((u) => [u.id, u.username]));
  const publicUrl = getEnv().PUBLIC_URL ?? "https://dash.example.com";

  return (
    <div>
      <Heading path="api-keys" />
      <p className="mb-4 text-sm text-fg-muted">
        Keys authenticate the REST API (<code>/api/v1</code>) and the MCP endpoint (<code>/mcp</code>).
        A key inherits its user&apos;s role.
      </p>
      <IssueKeyForm users={users.map((u) => ({ id: u.id, username: u.username }))} publicUrl={publicUrl} />

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-fg-muted">
            <th className="py-1">name</th><th>prefix</th><th>user</th><th>last used</th><th></th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k.id} className="border-b border-border/40">
              <td className="py-1.5">{k.name}</td>
              <td className="font-mono text-xs text-fg-muted">dl_{k.keyPrefix}…</td>
              <td>{byId.get(k.userId) ?? "?"}</td>
              <td className="text-xs text-fg-muted">{k.lastUsedAt ? new Date(k.lastUsedAt).toISOString().slice(0, 16).replace("T", " ") : "never"}</td>
              <td>
                {k.revokedAt ? (
                  <span className="text-xs text-fg-faint">revoked</span>
                ) : (
                  <form action={revokeKeyAction}>
                    <input type="hidden" name="id" value={k.id} />
                    <button className="text-xs text-err hover:underline">[revoke]</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
          {keys.length === 0 ? <tr><td colSpan={5} className="py-2 text-fg-faint">no keys yet</td></tr> : null}
        </tbody>
      </table>

      <h2 className="mb-2 mt-10 text-sm text-accent-ink">$ endpoints</h2>
      <p className="mb-3 text-xs text-fg-muted">
        Base <code>{publicUrl}</code>. Auth: <code>Authorization: Bearer dl_…</code>. Full spec at{" "}
        <a href="/api/v1/openapi.json" className="text-accent-ink hover:underline" target="_blank" rel="noreferrer">/api/v1/openapi.json</a>.
      </p>
      <div className="flex flex-col gap-5">
        {API_GROUPS.map((g) => (
          <div key={g.group}>
            <h3 className="mb-1 text-xs uppercase tracking-wide text-fg-faint">/{g.group}</h3>
            <table className="w-full border-collapse text-xs">
              <tbody>
                {g.endpoints.map((e) => (
                  <tr key={`${e.method} ${e.path}`} className="border-b border-border/30">
                    <td className={`w-24 py-1 font-mono ${methodColor(e.method)}`}>{e.method}</td>
                    <td className="w-80 py-1 font-mono text-fg">{e.path}</td>
                    <td className="w-24 py-1 text-fg-muted">{e.role}</td>
                    <td className="py-1 text-fg-muted">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-fg-faint">* public only when the dashboard is marked public; otherwise the caller must be able to view it.</p>

      <h2 className="mb-2 mt-10 text-sm text-accent-ink">$ mcp server</h2>
      <p className="mb-3 text-xs text-fg-muted">
        Streamable HTTP at <code>{publicUrl}/mcp</code>. Same bearer key. Connect Claude Code:
      </p>
      <code className="mb-3 block break-all border border-border bg-bg-elevated p-2 text-xs text-fg">
        claude mcp add --transport http dashlab {publicUrl}/mcp --header &quot;Authorization: Bearer dl_…&quot;
      </code>
      <table className="w-full border-collapse text-xs">
        <tbody>
          {MCP_TOOLS.map((t) => (
            <tr key={t.name} className="border-b border-border/30">
              <td className="w-24 py-1 text-fg-muted">{t.role}</td>
              <td className="py-1 font-mono text-fg">{t.name}</td>
              <td className="py-1 text-fg-muted">{t.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
