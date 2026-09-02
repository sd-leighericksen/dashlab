"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePage } from "@/lib/auth/guard";
import {
  writeRaw,
  deleteToTrash,
  WriteConflictError,
  AlreadyExistsError,
} from "@/lib/content/writer";
import { TEMPLATES } from "@/lib/content/templates";
import { CONTENT_KINDS, type ContentKindT } from "@/lib/content/kinds";
import { isValidSlug } from "@/lib/content/paths";
import { slugify } from "@/lib/crypto/random";

function asKind(v: FormDataEntryValue | null): ContentKindT {
  const s = String(v);
  if ((CONTENT_KINDS as readonly string[]).includes(s)) return s as ContentKindT;
  throw new Error("invalid kind");
}

export async function saveContent(formData: FormData): Promise<void> {
  await requirePage("admin");
  const kind = asKind(formData.get("kind"));
  const slug = String(formData.get("slug"));
  const raw = String(formData.get("raw") ?? "");
  const baseHash = String(formData.get("baseHash") ?? "") || undefined;
  const base = `/settings/content/${kind}/${slug}/edit`;
  try {
    await writeRaw(kind, slug, raw, { baseHash, requireExisting: true });
  } catch (e) {
    if (e instanceof WriteConflictError) {
      redirect(`${base}?error=${encodeURIComponent("file changed on disk — reload and reapply")}`);
    }
    redirect(`${base}?error=${encodeURIComponent((e as Error).message)}`);
  }
  revalidatePath(base);
  revalidatePath("/settings/content");
  redirect(`${base}?saved=1`);
}

export async function createContent(formData: FormData): Promise<void> {
  await requirePage("admin");
  const kind = asKind(formData.get("kind"));
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "") || name);
  if (!name || !isValidSlug(slug)) redirect("/settings/content/new?error=name+and+valid+slug+required");
  const template = TEMPLATES[kind].replace(/^name:.*$/m, `name: ${name}`);
  try {
    await writeRaw(kind, slug, template, { requireAbsent: true });
  } catch (e) {
    if (e instanceof AlreadyExistsError) redirect("/settings/content/new?error=slug+already+exists");
    redirect(`/settings/content/new?error=${encodeURIComponent((e as Error).message)}`);
  }
  redirect(`/settings/content/${kind}/${slug}/edit`);
}

export async function trashContent(formData: FormData): Promise<void> {
  await requirePage("admin");
  const kind = asKind(formData.get("kind"));
  const slug = String(formData.get("slug"));
  await deleteToTrash(kind, slug);
  revalidatePath("/settings/content");
  redirect("/settings/content?saved=1");
}
