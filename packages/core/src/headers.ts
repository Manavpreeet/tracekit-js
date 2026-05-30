import type { HeaderMap } from "./types";

export function normalizeHeaderName(name: string): string {
  return name.toLowerCase();
}

export function getHeader(
  headers: HeaderMap | undefined,
  name: string
): string | undefined {
  if (!headers) {
    return undefined;
  }

  const normalizedName = normalizeHeaderName(name);

  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (normalizeHeaderName(headerName) !== normalizedName) {
      continue;
    }

    if (Array.isArray(headerValue)) {
      const stringValues = headerValue.filter(
        (candidate): candidate is string => typeof candidate === "string"
      );

      return stringValues.length === 1 ? stringValues[0] : undefined;
    }

    return headerValue;
  }

  return undefined;
}

export function setHeaderValue(
  headers: Record<string, string> | undefined,
  name: string,
  value: string,
  overwrite: boolean
): Record<string, string> {
  const nextHeaders = { ...(headers ?? {}) };
  const normalizedName = normalizeHeaderName(name);
  const matchingKeys = Object.keys(nextHeaders).filter(
    (headerName) => normalizeHeaderName(headerName) === normalizedName
  );

  if (matchingKeys.length > 0 && !overwrite) {
    return nextHeaders;
  }

  for (const key of matchingKeys) {
    delete nextHeaders[key];
  }

  nextHeaders[name] = value;

  return nextHeaders;
}
