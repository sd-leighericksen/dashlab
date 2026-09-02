import { DetailPage } from "@/components/content/DetailPage";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; server: string }>;
}) {
  const { slug, server } = await params;
  return <DetailPage slug={slug} kind="server" itemSlug={server} />;
}
