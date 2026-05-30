import { getTraceContext } from "./async-storage";
import { getHeader, setHeaderValue } from "./headers";
import { generateRequestId } from "./id";
import { sanitizeIncomingId } from "./sanitize";
import { parseTraceparent } from "./traceparent";
import type {
  HeaderMap,
  TraceCarrier,
  TraceContext,
  TraceContextSource,
  TraceKitConfig,
  TraceKitResolvedConfig
} from "./types";

export const DEFAULT_CONFIG: TraceKitResolvedConfig = {
  allowIncomingRequestId: true,
  correlationHeaderName: "x-correlation-id",
  exposeResponseHeader: true,
  exposeSensitiveDataInLogs: false,
  generator: "uuid",
  maxHeaderLength: 128,
  overwriteOutgoingHeaders: false,
  requestHeaderName: "x-request-id",
  respectTraceparent: true,
  responseHeaderName: "x-request-id",
  sensitiveLogAllowlist: []
};

export function normalizeConfig(
  config?: TraceKitConfig
): TraceKitResolvedConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    sensitiveLogAllowlist: [...(config?.sensitiveLogAllowlist ?? [])]
  };
}

export function createTraceContext(input: {
  headers?: HeaderMap;
  config?: TraceKitConfig;
  source?: TraceContextSource;
}): TraceContext {
  const resolvedConfig = normalizeConfig(input.config);
  const incomingTraceparent = resolvedConfig.respectTraceparent
    ? parseTraceparent(getHeader(input.headers, "traceparent"))
    : undefined;
  const incomingRequestId = resolvedConfig.allowIncomingRequestId
    ? sanitizeIncomingId(
        getHeader(input.headers, resolvedConfig.requestHeaderName),
        resolvedConfig
      )
    : undefined;
  const incomingCorrelationId = sanitizeIncomingId(
    getHeader(input.headers, resolvedConfig.correlationHeaderName),
    resolvedConfig
  );
  const requestId = incomingRequestId ?? generateRequestId(resolvedConfig);
  const correlationId = incomingCorrelationId ?? requestId;
  const source =
    input.source ??
    resolveSource(Boolean(incomingTraceparent || incomingRequestId || incomingCorrelationId));

  return {
    requestId,
    correlationId,
    source,
    startedAt: Date.now(),
    ...(incomingTraceparent ? { traceId: incomingTraceparent.traceId } : {}),
    ...(incomingTraceparent ? { parentId: incomingTraceparent.parentId } : {})
  };
}

export function injectTraceHeaders(input: {
  headers?: Record<string, string>;
  config?: TraceKitConfig;
}): Record<string, string> {
  const resolvedConfig = normalizeConfig(input.config);
  const activeContext = getTraceContext();

  if (!activeContext) {
    return { ...(input.headers ?? {}) };
  }

  const requestHeaders = setHeaderValue(
    input.headers,
    resolvedConfig.requestHeaderName,
    activeContext.requestId,
    resolvedConfig.overwriteOutgoingHeaders
  );

  return setHeaderValue(
    requestHeaders,
    resolvedConfig.correlationHeaderName,
    activeContext.correlationId,
    resolvedConfig.overwriteOutgoingHeaders
  );
}

export function restoreTraceContext(input: {
  trace?: TraceCarrier;
  config?: TraceKitConfig;
}): TraceContext {
  const resolvedConfig = normalizeConfig(input.config);
  const requestId =
    sanitizeIncomingId(input.trace?.requestId, resolvedConfig) ??
    generateRequestId(resolvedConfig);
  const correlationId =
    sanitizeIncomingId(input.trace?.correlationId, resolvedConfig) ?? requestId;
  const traceId = sanitizeIncomingId(input.trace?.traceId, resolvedConfig);
  const parentId = sanitizeIncomingId(input.trace?.parentId, resolvedConfig);

  return {
    requestId,
    correlationId,
    source: "restored",
    startedAt: Date.now(),
    ...(traceId ? { traceId } : {}),
    ...(parentId ? { parentId } : {})
  };
}

function resolveSource(hasIncomingSignal: boolean): TraceContextSource {
  return hasIncomingSignal ? "incoming" : "generated";
}
