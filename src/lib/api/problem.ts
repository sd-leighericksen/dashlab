import { DomainError } from "./errors";

export function problemResponse(
  error: unknown,
  requestId: string,
  baseUrl?: string,
): Response {
  const de =
    error instanceof DomainError
      ? error
      : new DomainError("internal", "internal server error");
  const body: Record<string, unknown> = {
    type: baseUrl ? `${baseUrl}/problems/${de.code}` : `/problems/${de.code}`,
    title: de.code.replace(/_/g, " "),
    status: de.status,
    detail: de.detail,
    code: de.code,
    requestId,
    ...de.extra,
  };
  const headers: Record<string, string> = {
    "content-type": "application/problem+json; charset=utf-8",
    "x-request-id": requestId,
  };
  if (de.code === "unauthorized") headers["www-authenticate"] = 'Bearer realm="dashlab"';
  if (de.code === "rate_limited" && typeof de.extra.retryAfter === "number")
    headers["retry-after"] = String(de.extra.retryAfter);
  return new Response(JSON.stringify(body), { status: de.status, headers });
}
