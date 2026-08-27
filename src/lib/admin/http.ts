/** Standard JSON API response used by every /admin/api/* route. */
export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Parses a DELETE request's `{ slug: string }` JSON body, or `undefined` if missing/malformed. Shared by every /admin/api/* DELETE handler. */
export async function parseSlugFromRequest(
  request: Request,
): Promise<string | undefined> {
  const body = await request.json().catch(() => null);
  return body && typeof (body as { slug?: unknown }).slug === "string"
    ? (body as { slug: string }).slug
    : undefined;
}
