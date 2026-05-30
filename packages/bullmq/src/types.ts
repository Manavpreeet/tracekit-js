import type { TraceCarrier, TraceKitConfig } from "@tracekit/core";

export const TRACEKIT_METADATA_KEY = "__tracekit";

export type TraceableJobData<T extends Record<string, unknown>> = T & {
  __tracekit?: TraceCarrier;
};

export type TraceJobOptions = TraceKitConfig;
