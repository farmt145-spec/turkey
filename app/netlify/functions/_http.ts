import type { HandlerEvent, HandlerResponse } from "@netlify/functions";

export function eventToRequest(event: HandlerEvent) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers ?? {})) {
    if (typeof value === "string") headers.set(key, value);
  }

  const body = event.body
    ? event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : event.body
    : undefined;

  return new Request(event.rawUrl, {
    method: event.httpMethod,
    headers,
    body: event.httpMethod === "GET" || event.httpMethod === "HEAD" ? undefined : body,
  });
}

export async function responseToHandlerResult(response: Response): Promise<HandlerResponse> {
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  };
}
