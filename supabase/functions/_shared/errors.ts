import { getCorsHeaders, HttpError } from "./http.ts";

const INTERNAL_ERROR_PREFIX = "[internal]";

export function publicError(
  status: number,
  publicMsg: string,
  internalErr?: unknown,
  req?: Request,
): Response {
  if (internalErr) {
    console.error(INTERNAL_ERROR_PREFIX, internalErr);
  }

  return new Response(JSON.stringify({ error: publicMsg }), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

function toPublicMessage(status: number): string {
  if (status === 401) return "Unauthorized";
  if (status === 403) return "Forbidden";
  return "Request failed";
}

export function respondWithPublicError(error: unknown, req: Request): Response {
  const status = error instanceof HttpError ? error.status : 500;
  return publicError(status, toPublicMessage(status), error, req);
}
