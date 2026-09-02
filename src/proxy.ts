import { NextResponse, type NextRequest } from "next/server";

// Expose the request pathname to layouts (route-group root layouts don't get params).
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-dashlab-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"],
};
