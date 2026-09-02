/**
 * Notion export -> dashlab markdown importer.
 *
 * Usage:
 *   npm run import:notion -- <file|dir|zip> [more...] [--write] [--kind service|server|external] [--dir <content dir>]
 *
 * Default is a dry run (prints the frontmatter it would write). Pass --write to create files.
 * Kind is auto-detected per file from its fields unless --kind forces it.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { stringify as yamlStringify } from "yaml";
import { getPool } from "../src/lib/db/client";
import { writeRaw } from "../src/lib/content/writer";
import { slugify } from "../src/lib/crypto/random";
import type { ContentKindT } from "../src/lib/content/kinds";

type Props = Record<string, string>;
type Parsed = { title: string; props: Props; body: string };

function parseNotion(md: string): Parsed {
  const text = md.replace(/\r\n/g, "\n");
  const titleMatch = /^#\s+(.+)$/m.exec(text);
  const title = titleMatch ? titleMatch[1].trim() : "Untitled";
  const afterTitle = titleMatch ? text.slice(titleMatch.index + titleMatch[0].length) : text;
  // body starts at the first "## " heading or a "---" rule
  const bodyStart = afterTitle.search(/\n##\s|\n---\n/);
  const propBlock = bodyStart >= 0 ? afterTitle.slice(0, bodyStart) : afterTitle;
  const body = bodyStart >= 0 ? afterTitle.slice(bodyStart).replace(/^\n+/, "") : "";

  const props: Props = {};
  let currentKey: string | null = null;
  for (const line of propBlock.split("\n")) {
    const m = /^([A-Z][A-Za-z0-9 /()_-]*?):\s?(.*)$/.exec(line);
    if (m) {
      currentKey = m[1].trim();
      props[currentKey] = m[2];
    } else if (currentKey && line.length) {
      props[currentKey] += "\n" + line;
    }
  }
  for (const k of Object.keys(props)) props[k] = props[k].trim();
  return { title, props, body };
}

function detectKind(props: Props): ContentKindT {
  const keys = Object.keys(props).map((k) => k.toLowerCase());
  if (keys.some((k) => ["brand", "hostname", "cpu", "ram (gb)", "operating system"].includes(k)))
    return "server";
  if (keys.some((k) => ["service type", "provider", "monthly cost"].includes(k)))
    return "external";
  return "service";
}

const stripEntities = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const yesNo = (s: string) => /^(yes|true)$/i.test(s.trim());
const relSlug = (s: string) => slugify((s.split("(")[0] ?? s).trim());
const origin = (u: string) => {
  try {
    return new URL(u).origin;
  } catch {
    return u;
  }
};
const num = (s: string) => {
  const n = Number(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

function toFrontmatter(kind: ContentKindT, p: Parsed): Record<string, unknown> {
  const g = (k: string) => p.props[k];
  const fm: Record<string, unknown> = { name: p.title };
  if (kind === "service") {
    if (g("Status")) fm.status = g("Status").toLowerCase();
    if (g("Type")) fm.category = slugify(g("Type"));
    if (g("Port")) fm.port = num(g("Port"));
    const urls: Record<string, string> = {};
    if (g("Internal URL")) urls.local = g("Internal URL");
    if (g("Sub Domain")) urls.domain = origin(g("Sub Domain"));
    if (Object.keys(urls).length) fm.urls = urls;
    const install: Record<string, unknown> = {};
    if (g("Install Method")) install.method = g("Install Method").toLowerCase();
    if (g("Directory")) install.directory = g("Directory");
    if (g("Docker Container")) install.image = stripEntities(g("Docker Container"));
    if (g("Auto Start")) install.autostart = yesNo(g("Auto Start"));
    if (Object.keys(install).length) fm.install = install;
    if (g("Nimbus Cloud Servers")) fm.server = relSlug(g("Nimbus Cloud Servers"));
    if (g("Notes")) fm.description = g("Notes").split("\n")[0].slice(0, 200);
  } else if (kind === "server") {
    if (g("Status")) fm.status = g("Status").toLowerCase();
    if (g("Hostname")) fm.hostname = g("Hostname");
    const ips: Record<string, string> = {};
    if (g("Internal IP")) ips.internal = g("Internal IP");
    if (g("Tailscale IP")) ips.tailscale = g("Tailscale IP");
    if (Object.keys(ips).length) fm.ips = ips;
    const ssh: Record<string, unknown> = {};
    if (g("SSH Port")) ssh.port = num(g("SSH Port"));
    if (g("SSH Username")) ssh.user = g("SSH Username");
    if (Object.keys(ssh).length) fm.ssh = ssh;
    const hw: Record<string, unknown> = {};
    if (g("Brand")) hw.brand = g("Brand");
    if (g("Model")) hw.model = g("Model");
    if (g("CPU")) hw.cpu = g("CPU");
    if (g("RAM (GB)")) hw.ram_gb = num(g("RAM (GB)"));
    if (g("Storage")) hw.storage = g("Storage");
    if (Object.keys(hw).length) fm.hardware = hw;
    if (g("Operating System")) fm.os = g("Operating System");
    if (g("Location")) fm.location = g("Location");
    if (g("Primary Purpose")) fm.purpose = g("Primary Purpose");
    if (g("Tech Stack Overview")) fm.tech_stack = g("Tech Stack Overview");
  } else {
    const typeMap: Record<string, string> = { other: "other", saas: "saas", api: "api" };
    if (g("Service Type")) fm.type = typeMap[g("Service Type").toLowerCase()] ?? "other";
    if (g("Provider")) fm.provider = g("Provider");
    if (g("Status")) fm.status = g("Status").toLowerCase();
    if (g("Purpose")) fm.purpose = g("Purpose");
    const billing: Record<string, unknown> = {};
    if (g("Monthly Cost")) billing.monthly_cost = num(g("Monthly Cost")) ?? 0;
    if (Object.keys(billing).length) fm.billing = billing;
  }
  return fm;
}

async function collectFiles(inputs: string[]): Promise<{ file: string; content: string }[]> {
  const out: { file: string; content: string }[] = [];
  for (const input of inputs) {
    const stat = await fs.stat(input).catch(() => null);
    if (input.endsWith(".zip")) {
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "notion-"));
      execFileSync("unzip", ["-o", "-d", tmp, input], { stdio: "ignore" });
      out.push(...(await collectFiles([tmp])));
    } else if (stat?.isDirectory()) {
      const entries = await fs.readdir(input, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(input, e.name);
        if (e.isDirectory()) out.push(...(await collectFiles([full])));
        else if (e.name.endsWith(".md")) out.push({ file: full, content: await fs.readFile(full, "utf8") });
      }
    } else if (stat?.isFile() && input.endsWith(".md")) {
      out.push({ file: input, content: await fs.readFile(input, "utf8") });
    }
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const forceKind = args.includes("--kind") ? (args[args.indexOf("--kind") + 1] as ContentKindT) : null;
  const inputs = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--kind" && args[i - 1] !== "--dir");
  if (!inputs.length) {
    console.error("usage: import:notion -- <file|dir|zip>... [--write] [--kind service|server|external]");
    process.exit(1);
  }
  const files = await collectFiles(inputs);
  console.log(`found ${files.length} markdown file(s)\n`);

  let created = 0;
  for (const { file, content } of files) {
    const parsed = parseNotion(content);
    const kind = forceKind ?? detectKind(parsed.props);
    const fm = toFrontmatter(kind, parsed);
    const slug = slugify(parsed.title);
    const raw = `---\n${yamlStringify(fm).trim()}\n---\n\n${parsed.body}`.trimEnd() + "\n";
    console.log(`── ${kind}/${slug}.md  (from ${path.basename(file)})`);
    if (!write) {
      console.log(raw.split("\n").slice(0, 20).map((l) => "   " + l).join("\n"));
      console.log("   ...");
    } else {
      try {
        await writeRaw(kind, slug, raw, { force: true, requireAbsent: true });
        created++;
        console.log("   written");
      } catch (e) {
        console.log(`   SKIPPED: ${(e as Error).message}`);
      }
    }
    console.log("");
  }
  console.log(write ? `done — ${created} file(s) written` : "dry run — pass --write to create files");
  await getPool().end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
