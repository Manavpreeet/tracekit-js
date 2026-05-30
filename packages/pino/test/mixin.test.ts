import { Writable } from "node:stream";

import pino from "pino";
import { createTraceContext, runWithTraceContext } from "@tracekit/core";
import { describe, expect, it } from "vitest";

import { traceKitPinoMixin } from "../src/index";

describe("traceKitPinoMixin", () => {
  it("returns an empty object when there is no active trace context", () => {
    expect(traceKitPinoMixin()).toEqual({});
  });

  it("adds safe trace fields to pino logs", async () => {
    const chunks: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk.toString());
        callback();
      }
    });
    const logger = pino({ mixin: traceKitPinoMixin }, stream);
    const context = createTraceContext({
      config: {
        generator: () => "generated-request-id"
      }
    });

    await runWithTraceContext(context, async () => {
      logger.info("hello world");
    });

    expect(chunks).toHaveLength(1);

    const logLine = JSON.parse(chunks[0] ?? "{}") as Record<string, unknown>;

    expect(logLine.requestId).toBe("generated-request-id");
    expect(logLine.correlationId).toBe("generated-request-id");
    expect(logLine.msg).toBe("hello world");
    expect(logLine.authorization).toBeUndefined();
  });
});
