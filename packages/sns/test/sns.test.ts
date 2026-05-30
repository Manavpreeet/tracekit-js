import {
  createTraceContext,
  runWithTraceContext,
  TRACEKIT_MESSAGE_ATTRIBUTE_KEY
} from "@tracekit/core";
import { describe, expect, it } from "vitest";

import { enrichSnsPublishInput } from "../src/index";

describe("sns helpers", () => {
  it("enriches publish input when a context exists", () => {
    const input = runWithTraceContext(
      createTraceContext({
        config: {
          generator: () => "req_123"
        }
      }),
      () =>
        enrichSnsPublishInput({
          Message: "payload",
          TopicArn: "arn:aws:sns:us-east-1:123456789012:topic"
        })
    );

    expect(
      JSON.parse(
        input.MessageAttributes?.[TRACEKIT_MESSAGE_ATTRIBUTE_KEY]?.StringValue ??
          "{}"
      )
    ).toEqual({
      correlationId: "req_123",
      requestId: "req_123"
    });
  });

  it("leaves publish input unchanged when no context exists", () => {
    const input = enrichSnsPublishInput({
      Message: "payload",
      TopicArn: "arn:aws:sns:us-east-1:123456789012:topic"
    });

    expect(input.MessageAttributes).toBeUndefined();
  });
});
