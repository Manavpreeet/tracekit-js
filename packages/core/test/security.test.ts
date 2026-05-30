import { describe, expect, it } from "vitest";

import { createTraceContext, isSafeTraceId } from "../src/index";

describe("core security behavior", () => {
  it("never stores forbidden incoming header values in context", () => {
    const context = createTraceContext({
      config: {
        generator: () => "generated-request-id"
      },
      headers: {
        authorization: "Bearer super-secret",
        cookie: "session=secret",
        "set-cookie": "session=secret",
        "x-request-id": "req_123"
      }
    });

    expect(context).toEqual({
      correlationId: "req_123",
      requestId: "req_123",
      source: "incoming",
      startedAt: context.startedAt
    });
    expect("authorization" in context).toBe(false);
    expect("cookie" in context).toBe(false);
    expect("set-cookie" in context).toBe(false);
  });

  it("rejects unsafe incoming identifier payloads", () => {
    const unsafeValues = [
      "bad id",
      "line\nbreak",
      'quote"value',
      "<script>alert(1)</script>",
      '{"json":true}',
      "a".repeat(256),
      "unicode\u2028separator"
    ];

    for (const value of unsafeValues) {
      const context = createTraceContext({
        config: {
          generator: () => "generated-request-id"
        },
        headers: {
          "x-request-id": value
        }
      });

      expect(context.requestId).toBe("generated-request-id");
      expect(context.correlationId).toBe("generated-request-id");
    }
  });

  it("accepts conservative safe ids", () => {
    expect(isSafeTraceId("req_123:abc.def-ghi", { maxHeaderLength: 128 })).toBe(
      true
    );
  });

  it("does not auto-capture sensitive fields even when the debug override is enabled", () => {
    const context = createTraceContext({
      config: {
        exposeSensitiveDataInLogs: true,
        generator: () => "generated-request-id",
        sensitiveLogAllowlist: ["authorization", "userAgent"]
      },
      headers: {
        authorization: "Bearer super-secret",
        "user-agent": "TraceKitTest/1.0"
      }
    });

    expect(context).toEqual({
      correlationId: "generated-request-id",
      requestId: "generated-request-id",
      source: "generated",
      startedAt: context.startedAt
    });
  });
});
