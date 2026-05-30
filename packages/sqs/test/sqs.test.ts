import {
  createTraceContext,
  getCorrelationId,
  getRequestId,
  runWithTraceContext,
  TRACEKIT_MESSAGE_ATTRIBUTE_KEY
} from "@tracekit/core";
import { describe, expect, it, vi } from "vitest";

import { enrichSendMessageParams, processSqsMessageWithTrace } from "../src/index";

describe("sqs helpers", () => {
  it("enriches send params when a context exists", () => {
    const params = runWithTraceContext(
      createTraceContext({
        config: {
          generator: () => "req_123"
        }
      }),
      () =>
        enrichSendMessageParams({
          MessageBody: "{}",
          QueueUrl: "https://example.com/queue"
        })
    );

    expect(
      JSON.parse(
        params.MessageAttributes?.[TRACEKIT_MESSAGE_ATTRIBUTE_KEY]?.StringValue ??
          "{}"
      )
    ).toEqual({
      correlationId: "req_123",
      requestId: "req_123"
    });
  });

  it("leaves send params unchanged when no context exists", () => {
    const params = enrichSendMessageParams({
      MessageBody: "{}",
      QueueUrl: "https://example.com/queue"
    });

    expect(params.MessageAttributes).toBeUndefined();
  });

  it("restores trace context inside a consumer handler", async () => {
    const handler = vi.fn(async () => ({
      correlationId: getCorrelationId(),
      requestId: getRequestId()
    }));
    const wrapped = processSqsMessageWithTrace(handler);

    const result = await wrapped({
      MessageAttributes: {
        [TRACEKIT_MESSAGE_ATTRIBUTE_KEY]: {
          DataType: "String",
          StringValue: JSON.stringify({
            correlationId: "corr_123",
            requestId: "req_123"
          })
        }
      }
    });

    expect(result).toEqual({
      correlationId: "corr_123",
      requestId: "req_123"
    });
  });
});
