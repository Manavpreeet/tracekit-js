import { describe, expect, it, vi } from "vitest";

import { setResponseHeader } from "../src/response";

describe("setResponseHeader", () => {
  it("uses reply.header when available (Fastify)", () => {
    const header = vi.fn();
    const setHeader = vi.fn();

    setResponseHeader({ header, setHeader }, "x-request-id", "req_123");

    expect(header).toHaveBeenCalledWith("x-request-id", "req_123");
    expect(setHeader).not.toHaveBeenCalled();
  });

  it("falls back to setHeader when header is missing (Express)", () => {
    const setHeader = vi.fn();

    setResponseHeader({ setHeader }, "x-request-id", "req_123");

    expect(setHeader).toHaveBeenCalledWith("x-request-id", "req_123");
  });

  it("prefers header over setHeader when both exist", () => {
    const header = vi.fn();
    const setHeader = vi.fn();

    setResponseHeader({ header, setHeader }, "x-request-id", "req_123");

    expect(header).toHaveBeenCalledOnce();
    expect(setHeader).not.toHaveBeenCalled();
  });
});
