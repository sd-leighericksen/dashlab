import { requirePage } from "@/lib/auth/guard";
import { listUsers } from "@/lib/users";
import { Heading, TextField, SelectField, SaveButton, Notice } from "@/components/settings/fields";
import { addUser, changeRole, toggleDisabled, resetPassword } from "./actions";

export const dynamic = "force-dynamic";
const ROLES = [
  { value: "user", label: "user" },
  { value: "admin", label: "admin" },
  { value: "superuser", label: "superuser" },
];

export default async function UsersSettings({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const actor = await requirePage("superuser");
  const users = await listUsers();
  const { saved, error } = await searchParams;
  return (
    <div>
      <Heading path="users" />
      {error ? <p className="mb-2 text-sm text-err">! {error}</p> : null}
      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-fg-muted">
            <th className="py-1">username</th>
            <th>role</th>
            <th>status</th>
            <th>reset password</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border/40 align-middle">
              <td className="py-1.5">
                {u.username}
                {u.id === actor.user.id ? <span className="text-fg-faint"> (you)</span> : null}
              </td>
              <td>
                <form action={changeRole} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={u.id} />
                  <SelectField name="role" defaultValue={u.role} options={ROLES} />
                  <button type="submit" className="text-xs text-fg-muted hover:text-accent-ink">[set]</button>
                </form>
              </td>
              <td>
                {u.disabledAt ? (
                  <form action={toggleDisabled}>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="disabled" value="0" />
                    <button className="text-xs text-err hover:underline">disabled [enable]</button>
                  </form>
                ) : (
                  <form action={toggleDisabled}>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="disabled" value="1" />
                    <button className="text-xs text-ok hover:underline" disabled={u.id === actor.user.id}>
                      active {u.id !== actor.user.id ? "[disable]" : ""}
                    </button>
                  </form>
                )}
              </td>
              <td>
                <form action={resetPassword} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={u.id} />
                  <input
                    name="password"
                    type="password"
                    placeholder="temp password"
                    className="w-40 border border-border bg-bg px-2 py-0.5 text-xs outline-none focus:border-accent-ink"
                  />
                  <button type="submit" className="text-xs text-fg-muted hover:text-accent-ink">[reset]</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 text-sm text-accent-ink">+ new user</h2>
      <form action={addUser} className="flex flex-wrap items-end gap-2 text-sm">
        <TextField name="username" placeholder="username" />
        <TextField name="displayName" placeholder="display name" />
        <TextField name="password" type="password" placeholder="temp password" />
        <SelectField name="role" defaultValue="user" options={ROLES} />
        <SaveButton label="create" />
      </form>
      {saved ? <Notice>saved</Notice> : null}
    </div>
  );
}
