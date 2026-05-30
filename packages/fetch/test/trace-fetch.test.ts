import { createTraceContext, runWithTraceContext } from "@tracekit/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { traceFetch } from "../src/index";

describe("traceFetch", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("injects trace headers when context exists", async () => {
    globalThis.fetch = vi.fn(async (_input, init) => {
      const headers = Object.fromEntries(new Headers(init?.headers).entries());

      return new Response(JSON.stringify({ headers }));
    }) as typeof fetch;

    const response = await runWithTraceContext(
      createTraceContext({
        config: {
          generator: () => "generated-request-id"
        }
      }),
      () => traceFetch("https://example.com", { headers: { "x-custom": "value" } })
    );
    const body = (await response.json()) as { headers: Record<string, string> };

    expect(body.headers["x-request-id"]).toBe("generated-request-id");
    expect(body.headers["x-correlation-id"]).toBe("generated-request-id");
    expect(body.headers["x-custom"]).toBe("value");
  });

  it("preserves existing headers by default", async () => {
    globalThis.fetch = vi.fn(async (_input, init) => {
      const headers = Object.fromEntries(new Headers(init?.headers).entries());

      return new Response(JSON.stringify({ headers }));
    }) as typeof fetch;

    const response = await runWithTraceContext(
      createTraceContext({
        config: {
          generator: () => "generated-request-id"
        }
      }),
      () =>
        traceFetch(
          "https://example.com",
          {
            headers: {
              "X-Request-Id": "caller-value"
            }
          }
        )
    );
    const body = (await response.json()) as { headers: Record<string, string> };

    expect(body.headers["x-request-id"]).toBe("caller-value");
    expect(body.headers["x-correlation-id"]).toBe("generated-request-id");
  });

  it("overwrites existing headers when configured", async () => {
    globalThis.fetch = vi.fn(async (_input, init) => {
      const headers = Object.fromEntries(new Headers(init?.headers).entries());

      return new Response(JSON.stringify({ headers }));
    }) as typeof fetch;

    const response = await runWithTraceContext(
      createTraceContext({
        config: {
          generator: () => "generated-request-id"
        }
      }),
      () =>
        traceFetch(
          "https://example.com",
          {
            headers: {
              "X-Request-Id": "caller-value"
            }
          },
          {
            overwriteOutgoingHeaders: true
          }
        )
    );
    const body = (await response.json()) as { headers: Record<string, string> };

    expect(body.headers["x-request-id"]).toBe("generated-request-id");
    expect(body.headers["x-correlation-id"]).toBe("generated-request-id");
  });

  it("does not inject headers when no context exists", async () => {
    globalThis.fetch = vi.fn(async (_input, init) => {
      const headers = Object.fromEntries(new Headers(init?.headers).entries());

      return new Response(JSON.stringify({ headers }));
    }) as typeof fetch;

    const response = await traceFetch("https://example.com");
    const body = (await response.json()) as { headers: Record<string, string> };

    expect(body.headers["x-request-id"]).toBeUndefined();
    expect(body.headers["x-correlation-id"]).toBeUndefined();
  });
});
