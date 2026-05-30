import { injectTraceHeaders, type TraceKitConfig } from "@tracekit/core";

export async function traceFetch(
  input: string | URL | Request,
  init?: RequestInit,
  config?: TraceKitConfig
): Promise<Response> {
  const request = new Request(input, init);
  const headers = Object.fromEntries(request.headers.entries());
  const tracedHeaders = injectTraceHeaders({
    headers,
    ...(config ? { config } : {})
  });

  return globalThis.fetch(input, {
    ...init,
    headers: tracedHeaders
  });
}
