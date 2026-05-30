import type { TraceKitResolvedConfig } from "./types";

export const SAFE_ID_REGEX = /^[a-zA-Z0-9._:-]{1,128}$/;

export function isSafeTraceId(
  value: string,
  config: Pick<TraceKitResolvedConfig, "maxHeaderLength">
): boolean {
  if (value.length === 0 || value.length > config.maxHeaderLength) {
    return false;
  }

  if (value !== value.trim()) {
    return false;
  }

  if (value.includes("\n") || value.includes("\r") || value.includes("\t")) {
    return false;
  }

  return SAFE_ID_REGEX.test(value);
}

export function sanitizeIncomingId(
  value: string | undefined,
  config: Pick<TraceKitResolvedConfig, "maxHeaderLength">
): string | undefined {
  if (!value) {
    return undefined;
  }

  return isSafeTraceId(value, config) ? value : undefined;
}
