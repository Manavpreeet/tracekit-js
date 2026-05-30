import { getTraceContext } from "@tracekit/core";
import type winston from "winston";
import { format } from "winston";

export function traceKitWinstonFormat(): winston.Logform.Format {
  return format((info) => {
    const context = getTraceContext();

    if (!context) {
      return info;
    }

    return {
      ...info,
      correlationId: context.correlationId,
      requestId: context.requestId
    };
  })();
}
