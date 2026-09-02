import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/actor";
import { isSetupComplete } from "@/lib/auth/setup";
import { getSettings } from "@/lib/settings";
import { Prompt, Cursor } from "@/components/ui/terminal";
import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (!(await isSetupComplete())) redirect("/setup");
  if (await getActor()) redirect("/");
  const { error, next } = await searchParams;
  const settings = await getSettings();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <p className="text-accent-ink text-sm">
        {settings.homelabName.toLowerCase().replace(/\s+/g, "")}@dashlab <Cursor />
      </p>
      <p className="text-fg-muted text-sm">
        <Prompt /> login
      </p>
      {error ? <p className="text-err text-sm">! {error}</p> : null}
      <form action={loginAction} className="flex flex-col gap-3 text-sm">
        <input type="hidden" name="next" value={next ?? "/"} />
        <label className="grid grid-cols-[8rem_1fr] items-center gap-2">
          <span className="text-fg-muted">username</span>
          <input
            name="username"
            autoFocus
            autoComplete="username"
            className="border border-border bg-bg px-2 py-1 outline-none focus:border-accent-ink"
          />
        </label>
        <label className="grid grid-cols-[8rem_1fr] items-center gap-2">
          <span className="text-fg-muted">password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            className="border border-border bg-bg px-2 py-1 outline-none focus:border-accent-ink"
          />
        </label>
        <button
          type="submit"
          className="mt-2 self-start border border-accent-ink px-3 py-1 text-accent-ink hover:bg-accent-soft"
        >
          [ login ]
        </button>
      </form>
    </main>
  );
}
