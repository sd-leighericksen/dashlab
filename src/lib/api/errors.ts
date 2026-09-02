export type ProblemCode =
  | "validation_failed"
  | "not_found"
  | "conflict"
  | "precondition_required"
  | "etag_mismatch"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "payload_too_large"
  | "unsupported_media_type"
  | "upstream_unavailable"
  | "bad_request"
  | "internal";

const STATUS: Record<ProblemCode, number> = {
  validation_failed: 422,
  not_found: 404,
  conflict: 409,
  precondition_required: 428,
  etag_mismatch: 412,
  unauthorized: 401,
  forbidden: 403,
  rate_limited: 429,
  payload_too_large: 413,
  unsupported_media_type: 415,
  upstream_unavailable: 502,
  bad_request: 400,
  internal: 500,
};

export class DomainError extends Error {
  status: number;
  constructor(
    public code: ProblemCode,
    public detail: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(detail);
    this.status = STATUS[code];
  }
}

export const err = {
  notFound: (detail = "not found") => new DomainError("not_found", detail),
  conflict: (detail: string, extra?: Record<string, unknown>) =>
    new DomainError("conflict", detail, extra),
  validation: (issues: { path: string; message: string }[]) =>
    new DomainError("validation_failed", "validation failed", { errors: issues }),
  preconditionRequired: (detail = "If-Match header required") =>
    new DomainError("precondition_required", detail),
  etagMismatch: (currentEtag: string) =>
    new DomainError("etag_mismatch", "content changed since you read it", { currentEtag }),
  unauthorized: (detail = "authentication required") =>
    new DomainError("unauthorized", detail),
  forbidden: (requiredRole?: string) =>
    new DomainError("forbidden", "insufficient role", requiredRole ? { requiredRole } : {}),
  rateLimited: (retryAfter: number) =>
    new DomainError("rate_limited", "too many requests", { retryAfter }),
  badRequest: (detail: string) => new DomainError("bad_request", detail),
  tooLarge: (detail = "payload too large") => new DomainError("payload_too_large", detail),
};
