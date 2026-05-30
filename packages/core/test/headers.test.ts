import { describe, expect, it } from "vitest";

import {
  getHeader,
  normalizeHeaderName,
  setHeaderValue
} from "../src/index";

describe("header helpers", () => {
  it("reads headers case-insensitively", () => {
    const headerValue = getHeader(
      {
        "X-Request-Id": ["req_123"]
      },
      "x-request-id"
    );

    expect(headerValue).toBe("req_123");
  });

  it("rejects ambiguous multi-value headers", () => {
    const headerValue = getHeader(
      {
        "X-Request-Id": ["req_123", "req_456"]
      },
      "x-request-id"
    );

    expect(headerValue).toBeUndefined();
  });

  it("normalizes header names to lowercase", () => {
    expect(normalizeHeaderName("X-Request-Id")).toBe("x-request-id");
  });

  it("preserves existing headers by default", () => {
    const headers = setHeaderValue(
      {
        "X-Request-Id": "existing"
      },
      "x-request-id",
      "new-value",
      false
    );

    expect(headers).toEqual({
      "X-Request-Id": "existing"
    });
  });

  it("overwrites existing headers when explicitly enabled", () => {
    const headers = setHeaderValue(
      {
        "X-Request-Id": "existing"
      },
      "x-request-id",
      "new-value",
      true
    );

    expect(headers).toEqual({
      "x-request-id": "new-value"
    });
  });
});
