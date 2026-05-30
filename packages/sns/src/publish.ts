import {
  getTraceContext,
  injectTraceMessageAttributes,
  type AwsMessageAttributes
} from "@tracekit/core";

import type { SnsPublishInputLike } from "./types";

export function enrichSnsPublishInput<T extends SnsPublishInputLike>(
  input: T
): T & { MessageAttributes?: AwsMessageAttributes } {
  if (!getTraceContext()) {
    return input;
  }

  const messageAttributes = injectTraceMessageAttributes(
    input.MessageAttributes as AwsMessageAttributes | undefined
  );

  return {
    ...input,
    MessageAttributes: messageAttributes
  };
}
