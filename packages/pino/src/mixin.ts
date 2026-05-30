import { getTraceContext } from "@tracekit/core";

export function traceKitPinoMixin(): Record<string, string> {
  const context = getTraceContext();

  if (!context) {
    return {};
  }

  return {
    correlationId: context.correlationId,
    requestId: context.requestId
  };
}
