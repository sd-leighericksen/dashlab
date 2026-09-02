import { DetailPage } from "@/components/content/DetailPage";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; ext: string }>;
}) {
  const { slug, ext } = await params;
  return <DetailPage slug={slug} kind="external" itemSlug={ext} />;
}
