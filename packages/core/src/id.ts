import { randomUUID } from "node:crypto";

import type { TraceKitResolvedConfig } from "./types";

export function generateRequestId(
  config: Pick<TraceKitResolvedConfig, "generator">
): string {
  if (typeof config.generator === "function") {
    return config.generator();
  }

  return randomUUID();
}
