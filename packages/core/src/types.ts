export type TraceContextSource = "incoming" | "generated" | "restored";

export type TraceContext = {
  requestId: string;
  correlationId: string;
  traceId?: string;
  parentId?: string;
  source: TraceContextSource;
  startedAt: number;
};

export type HeaderValue = string | string[] | undefined;

export type HeaderMap = Record<string, HeaderValue>;

export type SensitiveLogField =
  | "authorization"
  | "cookie"
  | "requestBody"
  | "responseBody"
  | "ipAddress"
  | "userAgent"
  | "email"
  | "phone"
  | "sessionId";

export type TraceKitConfig = {
  requestHeaderName?: string;
  correlationHeaderName?: string;
  responseHeaderName?: string;
  respectTraceparent?: boolean;
  exposeResponseHeader?: boolean;
  generator?: "uuid" | (() => string);
  maxHeaderLength?: number;
  allowIncomingRequestId?: boolean;
  overwriteOutgoingHeaders?: boolean;
  exposeSensitiveDataInLogs?: boolean;
  sensitiveLogAllowlist?: SensitiveLogField[];
};

export type TraceKitResolvedConfig = {
  requestHeaderName: string;
  correlationHeaderName: string;
  responseHeaderName: string;
  respectTraceparent: boolean;
  exposeResponseHeader: boolean;
  generator: "uuid" | (() => string);
  maxHeaderLength: number;
  allowIncomingRequestId: boolean;
  overwriteOutgoingHeaders: boolean;
  exposeSensitiveDataInLogs: boolean;
  sensitiveLogAllowlist: SensitiveLogField[];
};

export type TraceCarrier = Partial<
  Pick<TraceContext, "requestId" | "correlationId" | "traceId" | "parentId">
>;
