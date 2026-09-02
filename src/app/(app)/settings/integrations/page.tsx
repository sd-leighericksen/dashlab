import { requirePage } from "@/lib/auth/guard";
import { Heading, Row, TextField, SaveButton } from "@/components/settings/fields";
import { currentSecretsForForm } from "@/lib/server/secrets";
import { readSnapshot } from "@/lib/server/integrations/snapshots";
import { saveBeszel, saveUptimeKuma, saveOpenRouter, clearIntegration } from "./actions";

export const dynamic = "force-dynamic";

function StatusLine({ source, status, error }: { source: string; status?: string; error?: string | null }) {
  const label = source === "env" ? "env-managed" : source === "db" ? "saved" : "not set";
  const st = status ?? "—";
  const color = st === "ok" ? "text-ok" : st === "auth_failed" ? "text-warn" : st === "unconfigured" || st === "—" ? "text-fg-faint" : "text-err";
  return (
    <p className="mb-2 text-xs">
      <span className="text-fg-muted">{label}</span>
      {" · "}
      <span className={color}>{st}{error && st !== "ok" && st !== "unconfigured" ? ` — ${error}` : ""}</span>
    </p>
  );
}

export default async function IntegrationsSettings() {
  await requirePage("superuser");
  const cur = currentSecretsForForm();
  const [beszelSnap, uptimeSnap, orSnap] = await Promise.all([
    readSnapshot("beszel", "overview", 30_000),
    readSnapshot("uptime_kuma", "overview", 60_000),
    readSnapshot("openrouter", "overview", 900_000),
  ]);

  return (
    <div>
      <Heading path="integrations" />
      <p className="mb-6 text-sm text-fg-muted">
        Saved encrypted in the database. Environment variables, if set, override these and show as
        <span className="text-fg"> env-managed</span>. Changes apply within a few seconds.
      </p>

      {/* Beszel */}
      <fieldset className="mb-6 border border-border p-4">
        <legend className="px-1 text-sm text-accent-ink">beszel · machine stats</legend>
        <StatusLine source={cur.beszel.source} status={beszelSnap?.status} error={beszelSnap?.error} />
        <form action={saveBeszel} className="flex flex-col gap-1">
          <Row label="url"><TextField name="url" defaultValue={cur.beszel.url} placeholder="http://goku:8090" /></Row>
          <Row label="email"><TextField name="email" defaultValue={cur.beszel.email} placeholder="you@example.com" /></Row>
          <Row label="password">
            <TextField name="password" type="password" placeholder={cur.beszel.hasPassword ? "•••••• (unchanged)" : "password"} />
          </Row>
          <div className="mt-2"><SaveButton /></div>
        </form>
        <div className="mt-2"><ClearButton id="beszel" /></div>
      </fieldset>

      {/* Uptime Kuma */}
      <fieldset className="mb-6 border border-border p-4">
        <legend className="px-1 text-sm text-accent-ink">uptime kuma</legend>
        <StatusLine source={cur.uptime_kuma.source} status={uptimeSnap?.status} error={uptimeSnap?.error} />
        <form action={saveUptimeKuma} className="flex flex-col gap-1">
          <Row label="url"><TextField name="url" defaultValue={cur.uptime_kuma.url} placeholder="http://host:3001" /></Row>
          <Row label="status_slug"><TextField name="statusSlug" defaultValue={cur.uptime_kuma.statusSlug} placeholder="homelab" /></Row>
          <Row label="api_key (optional)">
            <TextField name="apiKey" type="password" placeholder={cur.uptime_kuma.hasApiKey ? "•••••• (unchanged)" : "adds 30d uptime"} />
          </Row>
          <div className="mt-2"><SaveButton /></div>
        </form>
        <div className="mt-2"><ClearButton id="uptime_kuma" /></div>
      </fieldset>

      {/* OpenRouter */}
      <fieldset className="mb-6 border border-border p-4">
        <legend className="px-1 text-sm text-accent-ink">openrouter · spend</legend>
        <StatusLine source={cur.openrouter.source} status={orSnap?.status} error={orSnap?.error} />
        <form action={saveOpenRouter} className="flex flex-col gap-1">
          <Row label="management_key">
            <TextField name="managementKey" type="password" placeholder={cur.openrouter.hasManagementKey ? "•••••• (unchanged)" : "openrouter.ai/settings/management-keys"} />
          </Row>
          <Row label="api_key (optional)">
            <TextField name="apiKey" type="password" placeholder="normal key (optional)" />
          </Row>
          <div className="mt-2"><SaveButton /></div>
        </form>
        <div className="mt-2"><ClearButton id="openrouter" /></div>
      </fieldset>
    </div>
  );
}

function ClearButton({ id }: { id: string }) {
  return (
    <form action={clearIntegration}>
      <input type="hidden" name="id" value={id} />
      <button className="text-xs text-err hover:underline">[clear]</button>
    </form>
  );
}
