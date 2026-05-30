import "reflect-metadata";

import { getCorrelationId, getRequestId } from "@tracekit/core";
import { Controller, Get, Injectable, Module } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication
} from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { TraceKitModule } from "../src/index";

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
  async trace() {
    return this.traceProbeService.getTraceSnapshot();
  }
}

@Module({
  controllers: [TestController],
  providers: [TraceProbeService]
})
class TestFeatureModule {}

describe("TraceKitModule with Fastify", () => {
  async function createFastifyApp() {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TraceKitModule.forRoot({
          generator: () => "generated-request-id"
        }),
        TestFeatureModule
      ]
    }).compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    return app;
  }

  it("creates request context and exposes the response header", async () => {
    const app = await createFastifyApp();
    const response = await app.inject({
      method: "GET",
      url: "/trace"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      correlationId: "generated-request-id",
      requestId: "generated-request-id"
    });
    expect(response.headers["x-request-id"]).toBe("generated-request-id");

    await app.close();
  });

  it("reuses incoming safe request ids", async () => {
    const app = await createFastifyApp();
    const response = await app.inject({
      headers: {
        "x-request-id": "req_123"
      },
      method: "GET",
      url: "/trace"
    });

    expect(response.json()).toEqual({
      correlationId: "req_123",
      requestId: "req_123"
    });
    expect(response.headers["x-request-id"]).toBe("req_123");

    await app.close();
  });
});
