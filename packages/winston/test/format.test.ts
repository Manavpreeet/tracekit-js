import { Writable } from "node:stream";

import { createTraceContext, runWithTraceContext } from "@tracekit/core";
import { createLogger, format, transports } from "winston";
import { describe, expect, it } from "vitest";

import { traceKitWinstonFormat } from "../src/index";

describe("traceKitWinstonFormat", () => {
  it("enriches winston logs with safe trace fields", async () => {
    const chunks: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk.toString());
        callback();
      }
    });
    const logger = createLogger({
      format: format.combine(traceKitWinstonFormat(), format.json()),
      transports: [new transports.Stream({ stream })]
    });

    await runWithTraceContext(
      createTraceContext({
        config: {
          generator: () => "generated-request-id"
        }
      }),
      async () => {
        logger.info("hello world");
      }
    );

    expect(chunks).toHaveLength(1);

    const logLine = JSON.parse(chunks[0] ?? "{}") as Record<string, unknown>;

    expect(logLine.requestId).toBe("generated-request-id");
    expect(logLine.correlationId).toBe("generated-request-id");
    expect(logLine.message).toBe("hello world");
    expect(logLine.authorization).toBeUndefined();
  });

  it("does not fail when no context exists", () => {
    const enriched = traceKitWinstonFormat().transform({
      level: "info",
      message: "hello"
    });

    expect(enriched).toMatchObject({
      level: "info",
      message: "hello"
    });
  });
});
