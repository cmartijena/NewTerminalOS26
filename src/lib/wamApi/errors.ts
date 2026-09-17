export class WamApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "WamApiError";
  }
}

// wam_api.py reports failures two different ways: a non-200 HTTP status with an
// {"error": "..."} body, OR an HTTP 200 with the error embedded in the body instead.
// Every call site funnels through this so callers only ever deal with one shape.
export function normalizeWamResponse<T>(status: number, body: unknown): T {
  if (body && typeof body === "object" && "error" in body) {
    const message = String((body as { error: unknown }).error);
    throw new WamApiError(message, status);
  }
  if (status < 200 || status >= 300) {
    throw new WamApiError(`wam_api request failed with status ${status}`, status);
  }
  return body as T;
}
