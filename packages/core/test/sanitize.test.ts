import { describe, expect, it } from "vitest";

import {
  isSafeTraceId,
  normalizeConfig,
  sanitizeIncomingId
} from "../src/index";

describe("sanitize helpers", () => {
  const config = normalizeConfig();

  it("accepts safe identifiers", () => {
    expect(isSafeTraceId("req_123.abc:def-456", config)).toBe(true);
    expect(sanitizeIncomingId("req_123", config)).toBe("req_123");
  });

  it("rejects whitespace and unsafe characters", () => {
    expect(isSafeTraceId(" req_123", config)).toBe(false);
    expect(isSafeTraceId("req 123", config)).toBe(false);
    expect(isSafeTraceId("req<script>", config)).toBe(false);
    expect(sanitizeIncomingId("req\n123", config)).toBeUndefined();
  });

  it("rejects values that exceed the configured maximum length", () => {
    const longValue = "a".repeat(config.maxHeaderLength + 1);

    expect(isSafeTraceId(longValue, config)).toBe(false);
    expect(sanitizeIncomingId(longValue, config)).toBeUndefined();
  });
});
