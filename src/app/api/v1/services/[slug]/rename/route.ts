import { renameRoute } from "@/lib/api/content-routes";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const { POST } = renameRoute("service");
