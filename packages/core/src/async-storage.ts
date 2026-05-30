import { AsyncLocalStorage } from "node:async_hooks";

import type { TraceContext } from "./types";

const traceStorage = new AsyncLocalStorage<TraceContext>();

export function enterWithTraceContext(context: TraceContext): void {
  traceStorage.enterWith(context);
}

export function runWithTraceContext<T>(
  context: TraceContext,
  callback: () => T
): T {
  return traceStorage.run(context, callback);
}

export function getTraceContext(): TraceContext | undefined {
  return traceStorage.getStore();
}

export function getRequestId(): string | undefined {
  return getTraceContext()?.requestId;
}

export function getCorrelationId(): string | undefined {
  return getTraceContext()?.correlationId;
}
