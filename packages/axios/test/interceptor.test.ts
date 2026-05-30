import axios from "axios";
import { createTraceContext, runWithTraceContext } from "@tracekit/core";
import { describe, expect, it } from "vitest";

import { attachTraceKitAxiosInterceptor } from "../src/index";

describe("attachTraceKitAxiosInterceptor", () => {
  function createClient() {
    return axios.create({
      adapter: async (config) => ({
        config,
        data: {
          headers:
            typeof config.headers?.toJSON === "function"
              ? config.headers.toJSON()
              : config.headers
        },
        headers: {},
        status: 200,
        statusText: "OK"
      })
    });
  }

  it("returns the installed interceptor id", () => {
    const client = createClient();

    expect(attachTraceKitAxiosInterceptor(client)).toBeTypeOf("number");
  });

  it("injects trace headers when context exists", async () => {
    const client = createClient();

    attachTraceKitAxiosInterceptor(client);

    const response = await runWithTraceContext(
      createTraceContext({
        config: {
          generator: () => "generated-request-id"
        }
      }),
      () => client.get("https://example.com")
    );

    expect(response.data.headers["x-request-id"]).toBe("generated-request-id");
    expect(response.data.headers["x-correlation-id"]).toBe(
      "generated-request-id"
    );
  });

  it("does not inject trace headers when no context exists", async () => {
    const client = createClient();

    attachTraceKitAxiosInterceptor(client);

    const response = await client.get("https://example.com");

    expect(response.data.headers["x-request-id"]).toBeUndefined();
    expect(response.data.headers["x-correlation-id"]).toBeUndefined();
  });

  it("preserves existing headers by default", async () => {
    const client = createClient();

    attachTraceKitAxiosInterceptor(client);

    const response = await runWithTraceContext(
      createTraceContext({
        config: {
          generator: () => "generated-request-id"
        }
      }),
      () =>
        client.get("https://example.com", {
          headers: {
            "X-Request-Id": "caller-value"
          }
        })
    );

    expect(response.data.headers["X-Request-Id"]).toBe("caller-value");
    expect(response.data.headers["x-correlation-id"]).toBe(
      "generated-request-id"
    );
  });

  it("overwrites existing headers when configured", async () => {
    const client = createClient();

    attachTraceKitAxiosInterceptor(client, {
      overwriteOutgoingHeaders: true
    });

    const response = await runWithTraceContext(
      createTraceContext({
        config: {
          generator: () => "generated-request-id"
        }
      }),
      () =>
        client.get("https://example.com", {
          headers: {
            "X-Request-Id": "caller-value"
          }
        })
    );

    expect(response.data.headers["x-request-id"]).toBe("generated-request-id");
    expect(response.data.headers["X-Request-Id"]).toBeUndefined();
  });
});
