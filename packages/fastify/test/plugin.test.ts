import fastify from "fastify";
import { getRequestId } from "@tracekit/core";
import { describe, expect, it } from "vitest";

import { tracePlugin } from "../src/index";

describe("tracePlugin", () => {
  async function createServer() {
    const app = fastify();

    await app.register(tracePlugin, {
      generator: () => "generated-request-id"
    });
    app.addHook("preHandler", async (request) => {
      request.headers["x-pre-handler-request-id"] = getRequestId() ?? "";
    });
    app.get("/trace", async (request) => {
      await Promise.resolve();

      return {
        preHandlerRequestId: request.headers["x-pre-handler-request-id"],
        requestId: getRequestId()
      };
    });

    return app;
  }

  it("creates request context for fastify routes", async () => {
    const app = await createServer();
    const response = await app.inject({
      method: "GET",
      url: "/trace"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      preHandlerRequestId: "generated-request-id",
      requestId: "generated-request-id"
    });
    expect(response.headers["x-request-id"]).toBe("generated-request-id");

    await app.close();
  });

  it("reuses incoming safe request ids", async () => {
    const app = await createServer();
    const response = await app.inject({
      headers: {
        "x-request-id": "req_123"
      },
      method: "GET",
      url: "/trace"
    });

    expect(response.json()).toEqual({
      preHandlerRequestId: "req_123",
      requestId: "req_123"
    });
    expect(response.headers["x-request-id"]).toBe("req_123");

    await app.close();
  });

  it("ignores invalid incoming ids safely", async () => {
    const app = await createServer();
    const response = await app.inject({
      headers: {
        "x-request-id": "bad id"
      },
      method: "GET",
      url: "/trace"
    });

    expect(response.json()).toEqual({
      preHandlerRequestId: "generated-request-id",
      requestId: "generated-request-id"
    });

    await app.close();
  });
});
