"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePage } from "@/lib/auth/guard";
import { createCategory, updateCategory, deleteCategory, moveCategory } from "@/lib/categories";
import { slugify } from "@/lib/crypto/random";

export async function addCategory(formData: FormData): Promise<void> {
  await requirePage("admin");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/settings/categories?error=name+required");
  const slug = slugify(String(formData.get("slug") ?? "") || name);
  await createCategory({ name, slug, glyph: String(formData.get("glyph") ?? "") || undefined });
  revalidatePath("/settings/categories");
  redirect("/settings/categories?saved=1");
}
export async function editCategory(formData: FormData): Promise<void> {
  await requirePage("admin");
  await updateCategory(Number(formData.get("id")), {
    name: String(formData.get("name") ?? "").trim(),
    glyph: String(formData.get("glyph") ?? "").trim() || null,
  });
  revalidatePath("/settings/categories");
}
export async function removeCategory(formData: FormData): Promise<void> {
  await requirePage("admin");
  await deleteCategory(Number(formData.get("id")));
  revalidatePath("/settings/categories");
}
export async function reorderCategory(formData: FormData): Promise<void> {
  await requirePage("admin");
  await moveCategory(Number(formData.get("id")), Number(formData.get("dir")) as -1 | 1);
  revalidatePath("/settings/categories");
}
