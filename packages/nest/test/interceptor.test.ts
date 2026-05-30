import "reflect-metadata";

import { getCorrelationId, getRequestId } from "@tracekit/core";
import { Controller, Get, Injectable, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { TraceId, TraceKitModule } from "../src/index";

@Injectable()
class TraceProbeService {
  async getTraceSnapshot() {
    await Promise.resolve();

    return {
      correlationId: getCorrelationId(),
      requestId: getRequestId()
    };
  }
}

@Controller()
class TestController {
  constructor(private readonly traceProbeService: TraceProbeService) {}

  @Get("/trace")
  async trace(@TraceId() traceId: string | undefined) {
    return {
      traceId,
      ...(await this.traceProbeService.getTraceSnapshot())
    };
  }
}

@Module({
  controllers: [TestController],
  providers: [TraceProbeService]
})
class TestFeatureModule {}

describe("TraceKitModule", () => {
  async function createApp() {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TraceKitModule.forRoot({
          generator: () => "generated-request-id"
        }),
        TestFeatureModule
      ]
    }).compile();
    const app = moduleRef.createNestApplication();

    await app.init();

    return app;
  }

  it("creates request context for nest requests", async () => {
    const app = await createApp();
    const response = await request(app.getHttpServer()).get("/trace");

    expect(response.status).toBe(200);
    expect(response.body.requestId).toBe("generated-request-id");
    expect(response.body.correlationId).toBe("generated-request-id");
    expect(response.body.traceId).toBeUndefined();
    expect(response.headers["x-request-id"]).toBe("generated-request-id");

    await app.close();
  });

  it("reuses incoming safe request ids", async () => {
    const app = await createApp();
    const response = await request(app.getHttpServer())
      .get("/trace")
      .set("x-request-id", "req_123");

    expect(response.body.requestId).toBe("req_123");
    expect(response.body.correlationId).toBe("req_123");
    expect(response.body.traceId).toBeUndefined();
    expect(response.headers["x-request-id"]).toBe("req_123");

    await app.close();
  });

  it("ignores invalid incoming ids safely", async () => {
    const app = await createApp();
    const response = await request(app.getHttpServer())
      .get("/trace")
      .set("x-request-id", "bad id");

    expect(response.body.requestId).toBe("generated-request-id");
    expect(response.body.traceId).toBeUndefined();

    await app.close();
  });

  it("injects the traceparent trace id into the TraceId decorator", async () => {
    const app = await createApp();
    const response = await request(app.getHttpServer())
      .get("/trace")
      .set(
        "traceparent",
        "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
      );

    expect(response.body.requestId).toBe("generated-request-id");
    expect(response.body.correlationId).toBe("generated-request-id");
    expect(response.body.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");

    await app.close();
  });
});
