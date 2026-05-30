import { describe, expect, it } from "vitest";

import { createTraceCarrier } from "../src/index";

describe("createTraceCarrier", () => {
  it("returns the minimal carrier fields for a context", () => {
    const carrier = createTraceCarrier({
      correlationId: "corr_123",
      parentId: "parent_123",
      requestId: "req_123",
      source: "incoming",
      startedAt: 1,
      traceId: "trace_123"
    });

    expect(carrier).toEqual({
      correlationId: "corr_123",
      parentId: "parent_123",
      requestId: "req_123",
      traceId: "trace_123"
    });
  });

  it("returns undefined when there is no context", () => {
    expect(createTraceCarrier(undefined)).toBeUndefined();
  });
});
