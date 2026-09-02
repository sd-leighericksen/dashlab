"use client";
import { useActionState } from "react";
import { issueKeyAction, type IssueState } from "@/app/(app)/settings/api-keys/actions";

export function IssueKeyForm({
  users,
  publicUrl,
}: {
  users: { id: string; username: string }[];
  publicUrl: string;
}) {
  const [state, action, pending] = useActionState<IssueState, FormData>(issueKeyAction, {});
  return (
    <div>
      <form action={action} className="flex flex-wrap items-center gap-2 text-sm">
        <select name="userId" className="border border-border bg-bg px-2 py-1">
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.username}</option>
          ))}
        </select>
        <input name="name" placeholder="key name (e.g. claude)" className="border border-border bg-bg px-2 py-1" />
        <button type="submit" disabled={pending} className="border border-accent-ink px-3 py-1 text-accent-ink hover:bg-accent-soft">
          [ issue key ]
        </button>
      </form>
      {state.error ? <p className="mt-2 text-sm text-err">! {state.error}</p> : null}
      {state.key ? (
        <div className="mt-3 border border-accent-ink bg-accent-soft p-3 text-sm">
          <p className="text-warn">shown once — copy it now:</p>
          <code className="mt-1 block break-all text-accent-ink">{state.key}</code>
          <p className="mt-3 text-xs text-fg-muted">Connect Claude Code:</p>
          <code className="mt-1 block break-all text-fg">
            claude mcp add --transport http dashlab {publicUrl}/mcp --header &quot;Authorization: Bearer {state.key}&quot;
          </code>
        </div>
      ) : null}
    </div>
  );
}
