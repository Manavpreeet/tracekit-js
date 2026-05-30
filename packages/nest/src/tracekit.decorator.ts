import { getTraceContext } from "@tracekit/core";
import { createParamDecorator } from "@nestjs/common";

export const TraceId = createParamDecorator(
  (): string | undefined => getTraceContext()?.traceId
);
