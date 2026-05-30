import { restoreTraceContext, runWithTraceContext, type TraceKitConfig } from "@tracekit/core";
import type { Job } from "bullmq";

import { TRACEKIT_METADATA_KEY, type TraceableJobData } from "./types";

export function processJobWithTrace<
  T extends Record<string, unknown>,
  ResultType = unknown,
  NameType extends string = string
>(
  handler: (
    job: Job<TraceableJobData<T>, ResultType, NameType>
  ) => Promise<ResultType> | ResultType,
  config?: TraceKitConfig
): (
  job: Job<TraceableJobData<T>, ResultType, NameType>
) => Promise<ResultType> | ResultType {
  return (job) => {
    const traceCarrier = job.data?.[TRACEKIT_METADATA_KEY];
    const context = restoreTraceContext({
      ...(traceCarrier ? { trace: traceCarrier } : {}),
      ...(config ? { config } : {})
    });

    return runWithTraceContext(context, () => handler(job));
  };
}
