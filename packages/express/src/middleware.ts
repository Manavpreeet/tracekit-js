import {
  createTraceContext,
  normalizeConfig,
  runWithTraceContext,
  type HeaderMap,
  type TraceKitConfig
} from "@tracekit/core";
import type { RequestHandler } from "express";

export function traceMiddleware(config?: TraceKitConfig): RequestHandler {
  const resolvedConfig = normalizeConfig(config);

  return (request, response, next) => {
    const context = createTraceContext({
      config: resolvedConfig,
      headers: request.headers as HeaderMap
    });

    if (resolvedConfig.exposeResponseHeader) {
      response.setHeader(resolvedConfig.responseHeaderName, context.requestId);
    }

    runWithTraceContext(context, () => {
      next();
    });
  };
}
