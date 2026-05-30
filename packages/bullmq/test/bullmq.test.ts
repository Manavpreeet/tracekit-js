import {
  createTraceContext,
  getCorrelationId,
  getRequestId,
  runWithTraceContext
} from "@tracekit/core";
import { describe, expect, it, vi } from "vitest";

import {
  TRACEKIT_METADATA_KEY,
  addJobWithTrace,
  processJobWithTrace
} from "../src/index";

describe("bullmq helpers", () => {
  it("adds trace metadata when a context exists", async () => {
    const queue = {
      add: vi.fn(async (_name: string, payload: Record<string, unknown>) => ({
        data: payload
      }))
    };
    const originalData = {
      ticketId: "ticket_1"
    };

    const result = await runWithTraceContext(
      createTraceContext({
        config: {
          generator: () => "generated-request-id"
        }
      }),
      () => addJobWithTrace(queue as never, "send-email", originalData)
    );

    expect(queue.add).toHaveBeenCalledOnce();
    expect(result.data).toMatchObject({
      ticketId: "ticket_1",
      [TRACEKIT_METADATA_KEY]: {
        correlationId: "generated-request-id",
        requestId: "generated-request-id"
      }
    });
    expect(originalData).toEqual({
      ticketId: "ticket_1"
    });
  });

  it("does not add trace metadata when no context exists", async () => {
    const queue = {
      add: vi.fn(async (_name: string, payload: Record<string, unknown>) => ({
        data: payload
      }))
    };

    const result = await addJobWithTrace(queue as never, "send-email", {
      ticketId: "ticket_1"
    });

    expect(result.data[TRACEKIT_METADATA_KEY]).toBeUndefined();
  });

  it("restores trace context inside a processor", async () => {
    const handler = vi.fn(async () => ({
      correlationId: getCorrelationId(),
      requestId: getRequestId()
    }));
    const wrapped = processJobWithTrace(handler);

    const result = await wrapped({
      data: {
        [TRACEKIT_METADATA_KEY]: {
          correlationId: "corr_123",
          requestId: "req_123"
        }
      }
    } as never);

    expect(result).toEqual({
      correlationId: "corr_123",
      requestId: "req_123"
    });
  });

  it("repairs missing metadata when restoring context", async () => {
    const wrapped = processJobWithTrace(
      async () => ({
        correlationId: getCorrelationId(),
        requestId: getRequestId()
      }),
      {
        generator: () => "generated-request-id"
      }
    );

    const result = await wrapped({
      data: {}
    } as never);

    expect(result).toEqual({
      correlationId: "generated-request-id",
      requestId: "generated-request-id"
    });
  });

  it("repairs invalid metadata safely", async () => {
    const wrapped = processJobWithTrace(
      async () => ({
        correlationId: getCorrelationId(),
        requestId: getRequestId()
      }),
      {
        generator: () => "generated-request-id"
      }
    );

    const result = await wrapped({
      data: {
        [TRACEKIT_METADATA_KEY]: {
          correlationId: "bad corr",
          requestId: "bad request"
        }
      }
    } as never);

    expect(result).toEqual({
      correlationId: "generated-request-id",
      requestId: "generated-request-id"
    });
  });
});
