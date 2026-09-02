import { collectionRoutes } from "@/lib/api/content-routes";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const { GET, POST } = collectionRoutes("external");
