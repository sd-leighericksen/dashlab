import { getSettings } from "@/lib/settings";
import { requirePage } from "@/lib/auth/guard";
import { BANNER_FONTS } from "@/lib/banner";
import { accentTokens, contrastRatio } from "@/lib/theme";
import { Heading, Row, TextField, SelectField, SaveButton, Notice } from "@/components/settings/fields";
import { AccentPicker } from "@/components/settings/AccentPicker";
import { saveGeneral } from "./actions";

export const dynamic = "force-dynamic";

export default async function GeneralSettings({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePage("superuser");
  const s = await getSettings();
  const { saved, error } = await searchParams;
  const tok = accentTokens(s.accentDefault);
  const cLight = contrastRatio(tok.accentInkLight, "#efeeec").toFixed(2);
  const cDark = contrastRatio(tok.accentInkDark, "#131313").toFixed(2);

  return (
    <div>
      <Heading path="general" />
      {error ? <p className="mb-2 text-sm text-err">! {error}</p> : null}
      <form action={saveGeneral} className="flex flex-col gap-1">
        <Row label="homelab_name">
          <TextField name="homelabName" defaultValue={s.homelabName} />
        </Row>
        <Row label="banner_text">
          <TextField name="bannerText" defaultValue={s.bannerText} placeholder="(blank = homelab name)" />
        </Row>
        <Row label="banner_font">
          <SelectField
            name="bannerFont"
            defaultValue={s.bannerFont}
            options={BANNER_FONTS.map((f) => ({ value: f, label: f }))}
          />
        </Row>
        <Row label="theme_default">
          <SelectField
            name="themeDefault"
            defaultValue={s.themeDefault}
            options={[
              { value: "dark", label: "dark" },
              { value: "light", label: "light" },
            ]}
          />
        </Row>
        <Row label="accent_default">
          <AccentPicker name="accentDefault" defaultValue={s.accentDefault} fallback={s.accentDefault} />
        </Row>
        <p className="pl-[12.75rem] text-xs text-fg-faint">
          ink dark {tok.accentInkDark} ({cDark}:1) · ink light {tok.accentInkLight} ({cLight}:1)
        </p>
        <Row label="address_default">
          <SelectField
            name="addressDefault"
            defaultValue={s.addressDefault}
            options={[
              { value: "domain", label: "domain" },
              { value: "tailscale", label: "tailscale" },
              { value: "local", label: "local" },
            ]}
          />
        </Row>
        <Row label="probe_interval_s">
          <TextField name="probeIntervalS" type="number" defaultValue={s.probeIntervalS} />
        </Row>
        <Row label="probe_timeout_ms">
          <TextField name="probeTimeoutMs" type="number" defaultValue={s.probeTimeoutMs} />
        </Row>
        <div className="mt-3">
          <SaveButton />
        </div>
        {saved ? <Notice>settings saved</Notice> : null}
      </form>
    </div>
  );
}
