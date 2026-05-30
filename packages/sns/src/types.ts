import type { AwsMessageAttributes, TraceKitConfig } from "@tracekit/core";

export type SnsPublishInputLike = {
  Message?: string;
  TopicArn?: string;
  MessageAttributes?: AwsMessageAttributes;
};

export type SnsTraceConfig = TraceKitConfig;
