import { describe, expect, it } from "vitest";

import { isValidTraceparent, parseTraceparent } from "../src/index";

describe("traceparent helpers", () => {
  it("parses a valid traceparent header", () => {
    const parsed = parseTraceparent(
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
    );

    expect(parsed).toEqual({
      version: "00",
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      parentId: "00f067aa0ba902b7",
      traceFlags: "01"
    });
  });

  it("rejects invalid traceparent values safely", () => {
    expect(
      isValidTraceparent(
        "00-00000000000000000000000000000000-00f067aa0ba902b7-01"
      )
    ).toBe(false);
    expect(parseTraceparent("not-a-traceparent")).toBeUndefined();
  });
});
