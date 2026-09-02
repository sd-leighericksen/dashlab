import { DetailPage } from "@/components/content/DetailPage";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; item: string }>;
}) {
  const { slug, item } = await params;
  return <DetailPage slug={slug} kind="service" itemSlug={item} />;
}
