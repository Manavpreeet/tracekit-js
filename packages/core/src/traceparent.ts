export type ParsedTraceparent = {
  version: string;
  traceId: string;
  parentId: string;
  traceFlags: string;
};

const TRACEPARENT_REGEX =
  /^(?<version>[0-9a-f]{2})-(?<traceId>[0-9a-f]{32})-(?<parentId>[0-9a-f]{16})-(?<traceFlags>[0-9a-f]{2})$/i;

const ALL_ZERO_TRACE_ID = "00000000000000000000000000000000";
const ALL_ZERO_PARENT_ID = "0000000000000000";

export function parseTraceparent(
  value: string | undefined
): ParsedTraceparent | undefined {
  if (!value) {
    return undefined;
  }

  if (value !== value.trim()) {
    return undefined;
  }

  const match = TRACEPARENT_REGEX.exec(value);

  if (!match?.groups) {
    return undefined;
  }

  const { version, traceFlags, traceId, parentId } = match.groups;

  if (!version || !traceFlags || !traceId || !parentId) {
    return undefined;
  }

  const normalizedVersion = version.toLowerCase();
  const normalizedTraceId = traceId.toLowerCase();
  const normalizedParentId = parentId.toLowerCase();
  const normalizedTraceFlags = traceFlags.toLowerCase();

  if (normalizedVersion === "ff") {
    return undefined;
  }

  if (
    normalizedTraceId === ALL_ZERO_TRACE_ID ||
    normalizedParentId === ALL_ZERO_PARENT_ID
  ) {
    return undefined;
  }

  return {
    version: normalizedVersion,
    traceId: normalizedTraceId,
    parentId: normalizedParentId,
    traceFlags: normalizedTraceFlags
  };
}

export function isValidTraceparent(value: string | undefined): boolean {
  return parseTraceparent(value) !== undefined;
}
