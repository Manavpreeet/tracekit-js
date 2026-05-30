import type { TraceCarrier, TraceContext } from "./types";

export function createTraceCarrier(
  context: TraceContext | undefined
): TraceCarrier | undefined {
  if (!context) {
    return undefined;
  }

  return {
    requestId: context.requestId,
    correlationId: context.correlationId,
    ...(context.traceId ? { traceId: context.traceId } : {}),
    ...(context.parentId ? { parentId: context.parentId } : {})
  };
}
