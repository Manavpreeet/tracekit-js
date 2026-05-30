import { describe, expect, it } from "vitest";

import { generateRequestId, normalizeConfig } from "../src/index";

describe("generateRequestId", () => {
  it("uses crypto UUIDs by default", () => {
    const id = generateRequestId(normalizeConfig());

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("uses a custom generator when configured", () => {
    const id = generateRequestId(
      normalizeConfig({
        generator: () => "custom-request-id"
      })
    );

    expect(id).toBe("custom-request-id");
  });
});
