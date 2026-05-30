import {
  createTraceContext,
  enterWithTraceContext,
  normalizeConfig,
  type HeaderMap,
  type TraceContext,
  type TraceKitConfig
} from "@tracekit/core";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    tracekitContext?: TraceContext;
  }
}

export const tracePlugin: FastifyPluginAsync<TraceKitConfig> = fp(
  async (fastify, options) => {
    const resolvedConfig = normalizeConfig(options);

    fastify.addHook("onRequest", (request, reply, done) => {
      const context = createTraceContext({
        config: resolvedConfig,
        headers: request.headers as HeaderMap
      });

      request.tracekitContext = context;

      if (resolvedConfig.exposeResponseHeader) {
        reply.header(resolvedConfig.responseHeaderName, context.requestId);
      }

      enterWithTraceContext(context);
      done();
    });
  },
  {
    name: "tracekit-fastify"
  }
);
