import type { AwsMessageAttributes, TraceKitConfig } from "@tracekit/core";

export type SqsMessageLike = {
  MessageAttributes?: AwsMessageAttributes;
};

export type SqsSendMessageParamsLike = {
  MessageBody?: string;
  QueueUrl?: string;
  MessageAttributes?: AwsMessageAttributes;
};

export type SqsTraceConfig = TraceKitConfig;
