import { createTraceCarrier } from "./carrier";
import { getTraceContext } from "./async-storage";
import type { TraceCarrier } from "./types";

export const TRACEKIT_MESSAGE_ATTRIBUTE_KEY = "__tracekit";

export type AwsMessageAttributeValue = {
  DataType: string;
  StringValue?: string;
  BinaryValue?: Uint8Array;
};

export type AwsMessageAttributes = Record<string, AwsMessageAttributeValue>;

export function injectTraceMessageAttributes(
  attributes: AwsMessageAttributes = {}
): AwsMessageAttributes {
  const carrier = createTraceCarrier(getTraceContext());

  if (!carrier) {
    return attributes;
  }

  return {
    ...attributes,
    [TRACEKIT_MESSAGE_ATTRIBUTE_KEY]: {
      DataType: "String",
      StringValue: JSON.stringify(carrier)
    }
  };
}

export function extractTraceCarrierFromMessageAttributes(
  attributes?: AwsMessageAttributes | null
): TraceCarrier | undefined {
  const raw = attributes?.[TRACEKIT_MESSAGE_ATTRIBUTE_KEY]?.StringValue;

  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as TraceCarrier;

    if (
      typeof parsed.requestId === "string" &&
      typeof parsed.correlationId === "string"
    ) {
      return parsed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
