import { describe, expect, it } from "vitest";

import {
  createTraceContext,
  enterWithTraceContext,
  getCorrelationId,
  getRequestId,
  getTraceContext,
  injectTraceHeaders,
  normalizeConfig,
  restoreTraceContext,
  runWithTraceContext
} from "../src/index";

describe("core context flow", () => {
  it("normalizes config with safe defaults", () => {
    const normalized = normalizeConfig();

    expect(normalized.requestHeaderName).toBe("x-request-id");
    expect(normalized.correlationHeaderName).toBe("x-correlation-id");
    expect(normalized.overwriteOutgoingHeaders).toBe(false);
    expect(normalized.sensitiveLogAllowlist).toEqual([]);
  });

  it("reuses a valid incoming request id", () => {
    const context = createTraceContext({
      config: normalizeConfig({
        generator: () => "generated-request-id"
      }),
      headers: {
        "x-request-id": "req_123"
      }
    });

    expect(context.requestId).toBe("req_123");
    expect(context.correlationId).toBe("req_123");
    expect(context.source).toBe("incoming");
  });

  it("ignores an invalid request id and generates a safe replacement", () => {
    const context = createTraceContext({
      config: normalizeConfig({
        generator: () => "generated-request-id"
      }),
      headers: {
        "x-request-id": "bad id"
      }
    });

    expect(context.requestId).toBe("generated-request-id");
    expect(context.correlationId).toBe("generated-request-id");
    expect(context.source).toBe("generated");
  });

  it("respects traceparent without requiring incoming request headers", () => {
    const context = createTraceContext({
      config: normalizeConfig({
        generator: () => "generated-request-id"
      }),
      headers: {
        traceparent:
          "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
      }
    });

    expect(context.requestId).toBe("generated-request-id");
    expect(context.correlationId).toBe("generated-request-id");
    expect(context.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
    expect(context.parentId).toBe("00f067aa0ba902b7");
    expect(context.source).toBe("incoming");
  });

  it("restores queue metadata safely", () => {
    const context = restoreTraceContext({
      config: normalizeConfig({
        generator: () => "generated-request-id"
      }),
      trace: {
        correlationId: "corr_123",
        requestId: "req_123",
        traceId: "trace_123"
      }
    });

    expect(context).toMatchObject({
      correlationId: "corr_123",
      requestId: "req_123",
      source: "restored",
      traceId: "trace_123"
    });
  });

  it("repairs missing or invalid queue metadata", () => {
    const context = restoreTraceContext({
      config: normalizeConfig({
        generator: () => "generated-request-id"
      }),
      trace: {
        correlationId: "bad corr"
      }
    });

    expect(context.requestId).toBe("generated-request-id");
    expect(context.correlationId).toBe("generated-request-id");
  });

  it("keeps async local storage context across awaits", async () => {
    const context = createTraceContext({
      config: normalizeConfig({
        generator: () => "generated-request-id"
      })
    });

    await runWithTraceContext(context, async () => {
      await Promise.resolve();

      expect(getTraceContext()).toMatchObject({
        correlationId: "generated-request-id",
        requestId: "generated-request-id"
      });
      expect(getRequestId()).toBe("generated-request-id");
      expect(getCorrelationId()).toBe("generated-request-id");
    });

    expect(getTraceContext()).toBeUndefined();
    expect(getRequestId()).toBeUndefined();
  });

  it("supports entering a context for framework-managed request lifecycles", async () => {
    const context = createTraceContext({
      config: normalizeConfig({
        generator: () => "generated-request-id"
      })
    });

    await runWithTraceContext(
      createTraceContext({
        config: normalizeConfig({
          generator: () => "outer-request-id"
        })
      }),
      async () => {
        enterWithTraceContext(context);
        await Promise.resolve();

        expect(getRequestId()).toBe("generated-request-id");
        expect(getCorrelationId()).toBe("generated-request-id");
      }
    );
  });

  it("injects safe outgoing headers from the active context", async () => {
    const context = createTraceContext({
      config: normalizeConfig({
        generator: () => "generated-request-id"
      })
    });

    const headers = await runWithTraceContext(context, async () =>
      injectTraceHeaders({
        headers: {
          "x-custom-header": "value"
        }
      })
    );

    expect(headers).toEqual({
      "x-correlation-id": "generated-request-id",
      "x-custom-header": "value",
      "x-request-id": "generated-request-id"
    });
  });

  it("preserves explicit outgoing headers by default", async () => {
    const context = createTraceContext({
      config: normalizeConfig({
        generator: () => "generated-request-id"
      })
    });

    const headers = await runWithTraceContext(context, async () =>
      injectTraceHeaders({
        headers: {
          "X-Request-Id": "caller-value"
        }
      })
    );

    expect(headers).toEqual({
      "X-Request-Id": "caller-value",
      "x-correlation-id": "generated-request-id"
    });
  });

  it("overwrites explicit outgoing headers only when configured", async () => {
    const context = createTraceContext({
      config: normalizeConfig({
        generator: () => "generated-request-id"
      })
    });

    const headers = await runWithTraceContext(context, async () =>
      injectTraceHeaders({
        config: {
          overwriteOutgoingHeaders: true
        },
        headers: {
          "X-Request-Id": "caller-value"
        }
      })
    );

    expect(headers).toEqual({
      "x-correlation-id": "generated-request-id",
      "x-request-id": "generated-request-id"
    });
  });

  it("returns a copy of incoming headers when there is no active context", () => {
    const headers = injectTraceHeaders({
      headers: {
        "x-custom-header": "value"
      }
    });

    expect(headers).toEqual({
      "x-custom-header": "value"
    });
    expect(headers).not.toBeUndefined();
  });
});
