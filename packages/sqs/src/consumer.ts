import {
  extractTraceCarrierFromMessageAttributes,
  restoreTraceContext,
  runWithTraceContext,
  type TraceKitConfig
} from "@tracekit/core";

import type { SqsMessageLike } from "./types";

export function processSqsMessageWithTrace<
  Message extends SqsMessageLike,
  ResultType = unknown
>(
  handler: (message: Message) => Promise<ResultType> | ResultType,
  config?: TraceKitConfig
): (message: Message) => Promise<ResultType> | ResultType {
  return (message) => {
    const traceCarrier = extractTraceCarrierFromMessageAttributes(
      message.MessageAttributes
    );
    const context = restoreTraceContext({
      ...(traceCarrier ? { trace: traceCarrier } : {}),
      ...(config ? { config } : {})
    });

    return runWithTraceContext(context, () => handler(message));
  };
}
