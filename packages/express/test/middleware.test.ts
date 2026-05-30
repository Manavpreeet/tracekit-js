import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { getRequestId } from "@tracekit/core";

import { traceMiddleware } from "../src/index";

describe("traceMiddleware", () => {
  function createApp() {
    const app = express();

    app.use(traceMiddleware());
    app.get("/ping", async (_request, response) => {
      await Promise.resolve();

      response.json({
        requestId: getRequestId()
      });
    });

    return app;
  }

  it("generates a request id when none is provided", async () => {
    const response = await request(createApp()).get("/ping");

    expect(response.status).toBe(200);
    expect(response.body.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(response.headers["x-request-id"]).toBe(response.body.requestId);
  });

  it("reuses a valid incoming request id", async () => {
    const response = await request(createApp())
      .get("/ping")
      .set("x-request-id", "req_123");

    expect(response.body.requestId).toBe("req_123");
    expect(response.headers["x-request-id"]).toBe("req_123");
  });

  it("keeps context available inside async route handlers", async () => {
    const response = await request(createApp()).get("/ping");

    expect(response.body.requestId).toBeTruthy();
  });

  it("ignores invalid incoming ids and replaces them safely", async () => {
    const response = await request(createApp())
      .get("/ping")
      .set("x-request-id", "bad id");

    expect(response.body.requestId).not.toBe("bad id");
    expect(response.headers["x-request-id"]).toBe(response.body.requestId);
  });

  it("can disable response header exposure", async () => {
    const app = express();

    app.use(
      traceMiddleware({
        exposeResponseHeader: false
      })
    );
    app.get("/ping", (_request, response) => {
      response.json({
        requestId: getRequestId()
      });
    });

    const response = await request(app).get("/ping");

    expect(response.headers["x-request-id"]).toBeUndefined();
    expect(response.body.requestId).toBeTruthy();
  });
});
