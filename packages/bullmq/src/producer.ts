import { createTraceCarrier, getTraceContext } from "@tracekit/core";
import type { Job, JobsOptions, Queue } from "bullmq";

import {
  TRACEKIT_METADATA_KEY,
  type TraceableJobData
} from "./types";

export async function addJobWithTrace<
  T extends Record<string, unknown>,
  NameType extends string = string
>(
  queue: Pick<Queue, "add">,
  name: NameType,
  data: T,
  opts?: JobsOptions
): Promise<Job<TraceableJobData<T>, unknown, NameType>> {
  const traceCarrier = createTraceCarrier(getTraceContext());
  const payload = traceCarrier
    ? ({
        ...data,
        [TRACEKIT_METADATA_KEY]: traceCarrier
      } as TraceableJobData<T>)
    : ({ ...data } as TraceableJobData<T>);

  return queue.add(name, payload, opts) as Promise<
    Job<TraceableJobData<T>, unknown, NameType>
  >;
}
