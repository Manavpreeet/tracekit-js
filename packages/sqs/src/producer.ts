import {
  getTraceContext,
  injectTraceMessageAttributes,
  type AwsMessageAttributes
} from "@tracekit/core";

import type { SqsSendMessageParamsLike } from "./types";

export function enrichSendMessageParams<
  T extends SqsSendMessageParamsLike
>(params: T): T & { MessageAttributes?: AwsMessageAttributes } {
  if (!getTraceContext()) {
    return params;
  }

  const messageAttributes = injectTraceMessageAttributes(
    params.MessageAttributes as AwsMessageAttributes | undefined
  );

  return {
    ...params,
    MessageAttributes: messageAttributes
  };
}
