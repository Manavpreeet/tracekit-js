import {
  createTraceContext,
  runWithTraceContext,
  TRACEKIT_MESSAGE_ATTRIBUTE_KEY
} from "../src/index";
import { describe, expect, it } from "vitest";

import {
  extractTraceCarrierFromMessageAttributes,
  injectTraceMessageAttributes
} from "../src/message-attributes";

describe("message attribute helpers", () => {
  it("injects a trace carrier attribute when context exists", () => {
    const attributes = runWithTraceContext(
      createTraceContext({
        config: {
          generator: () => "req_123"
        }
      }),
      () => injectTraceMessageAttributes({ existing: { DataType: "String", StringValue: "1" } })
    );

    expect(attributes.existing).toEqual({
      DataType: "String",
      StringValue: "1"
    });
    expect(attributes[TRACEKIT_MESSAGE_ATTRIBUTE_KEY]).toEqual({
      DataType: "String",
      StringValue: expect.any(String)
    });
    const traceAttribute = attributes[TRACEKIT_MESSAGE_ATTRIBUTE_KEY];

    expect(JSON.parse(traceAttribute?.StringValue ?? "")).toEqual({
      correlationId: "req_123",
      requestId: "req_123"
    });
  });

  it("returns attributes unchanged when there is no active context", () => {
    const attributes = injectTraceMessageAttributes({
      existing: { DataType: "String", StringValue: "1" }
    });

    expect(attributes[TRACEKIT_MESSAGE_ATTRIBUTE_KEY]).toBeUndefined();
  });

  it("extracts a valid carrier from message attributes", () => {
    const carrier = extractTraceCarrierFromMessageAttributes({
      [TRACEKIT_MESSAGE_ATTRIBUTE_KEY]: {
        DataType: "String",
        StringValue: JSON.stringify({
          correlationId: "corr_123",
          requestId: "req_123",
          traceId: "trace_123"
        })
      }
    });

    expect(carrier).toEqual({
      correlationId: "corr_123",
      requestId: "req_123",
      traceId: "trace_123"
    });
  });

  it("returns undefined for invalid carrier payloads", () => {
    expect(
      extractTraceCarrierFromMessageAttributes({
        [TRACEKIT_MESSAGE_ATTRIBUTE_KEY]: {
          DataType: "String",
          StringValue: "not-json"
        }
      })
    ).toBeUndefined();
    expect(
      extractTraceCarrierFromMessageAttributes({
        [TRACEKIT_MESSAGE_ATTRIBUTE_KEY]: {
          DataType: "String",
          StringValue: JSON.stringify({ requestId: 1 })
        }
      })
    ).toBeUndefined();
  });
});
