import { injectTraceHeaders, type TraceKitConfig } from "@tracekit/core";
import type {
  AxiosInstance,
  AxiosRequestHeaders,
  InternalAxiosRequestConfig,
  RawAxiosRequestHeaders
} from "axios";

export function attachTraceKitAxiosInterceptor(
  axiosInstance: AxiosInstance,
  config?: TraceKitConfig
): number {
  return axiosInstance.interceptors.request.use((requestConfig) => {
    const currentHeaders = toPlainHeaders(requestConfig);

    requestConfig.headers = injectTraceHeaders({
      headers: currentHeaders,
      ...(config ? { config } : {})
    }) as AxiosRequestHeaders;

    return requestConfig;
  });
}

function toPlainHeaders(
  requestConfig: InternalAxiosRequestConfig
): Record<string, string> {
  const headers = requestConfig.headers;

  if (!headers) {
    return {};
  }

  const rawHeaders =
    typeof headers.toJSON === "function"
      ? (headers.toJSON() as RawAxiosRequestHeaders)
      : (headers as RawAxiosRequestHeaders);
  const normalizedHeaders: Record<string, string> = {};

  for (const [headerName, headerValue] of Object.entries(rawHeaders)) {
    if (Array.isArray(headerValue)) {
      const firstValue = headerValue.find(
        (candidate): candidate is string => typeof candidate === "string"
      );

      if (firstValue) {
        normalizedHeaders[headerName] = firstValue;
      }

      continue;
    }

    if (
      typeof headerValue === "string" ||
      typeof headerValue === "number" ||
      typeof headerValue === "boolean"
    ) {
      normalizedHeaders[headerName] = String(headerValue);
    }
  }

  return normalizedHeaders;
}
