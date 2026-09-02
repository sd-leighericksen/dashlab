import { DetailPage } from "@/components/content/DetailPage";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; bookmark: string }>;
}) {
  const { slug, bookmark } = await params;
  return <DetailPage slug={slug} kind="bookmark" itemSlug={bookmark} />;
}
