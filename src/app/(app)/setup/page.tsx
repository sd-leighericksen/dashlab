import { redirect } from "next/navigation";
import { isSetupComplete } from "@/lib/auth/setup";
import { Prompt, Cursor } from "@/components/ui/terminal";
import { completeSetupAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isSetupComplete()) redirect("/login");
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 p-6">
      <pre className="text-accent-ink text-xs leading-tight">
{`  ___          _   _      _   
 |   \\ __ _ ___| |_| |__ _| |__
 | |) / _\` (_-< ' \\ / _\` | '_ \\
 |___/\\__,_/__/_||_\\__,_|_.__/`}
      </pre>
      <p className="text-fg-muted text-sm">
        <Prompt>#</Prompt> first-run setup. Enter the code printed in the container logs.
      </p>
      {error ? <p className="text-err text-sm">! {error}</p> : null}
      <form action={completeSetupAction} className="flex flex-col gap-3 text-sm">
        <Field name="code" label="setup_code" placeholder="XXXX-XXXX" autoFocus />
        <Field name="homelabName" label="homelab_name" placeholder="Nimbus Cloud" />
        <Field name="username" label="username" placeholder="leigh" />
        <Field name="displayName" label="display_name" placeholder="Leigh" />
        <Field name="password" label="password" type="password" placeholder="min 12 chars" />
        <button
          type="submit"
          className="mt-2 self-start border border-accent-ink px-3 py-1 text-accent-ink hover:bg-accent-soft"
        >
          [ create superuser ] <Cursor />
        </button>
      </form>
    </main>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  autoFocus,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="grid grid-cols-[10rem_1fr] items-center gap-2">
      <span className="text-fg-muted">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className="border border-border bg-bg px-2 py-1 text-fg outline-none focus:border-accent-ink"
      />
    </label>
  );
}
