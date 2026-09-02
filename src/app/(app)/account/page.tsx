import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/actor";
import { Heading, Row, TextField, SaveButton, Notice } from "@/components/settings/fields";
import { changePasswordAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; change?: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/login?next=/account");
  const { saved, error, change } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Heading path="account" />
      <p className="mb-4 text-sm text-fg-muted">
        {actor.user.displayName ?? actor.user.username} · {actor.role}
      </p>
      {change ? <p className="mb-2 text-sm text-warn">! you must change your password</p> : null}
      {error ? <p className="mb-2 text-sm text-err">! {error}</p> : null}
      <form action={changePasswordAction} className="flex flex-col gap-1">
        <Row label="current_password">
          <TextField name="current" type="password" />
        </Row>
        <Row label="new_password">
          <TextField name="next" type="password" placeholder="min 12 chars" />
        </Row>
        <div className="mt-3">
          <SaveButton label="change password" />
        </div>
        {saved ? <Notice>password changed</Notice> : null}
      </form>
      <a href="/" className="mt-6 block text-xs text-fg-muted hover:text-accent-ink">
        [← back]
      </a>
    </div>
  );
}
