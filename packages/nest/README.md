# @tracekit/nest

NestJS integration for TraceKit request correlation. Works with both Express and
Fastify platform adapters.

## Install

```bash
pnpm add @tracekit/core @tracekit/nest @nestjs/common @nestjs/core rxjs reflect-metadata
```

For Fastify-based Nest apps:

```bash
pnpm add @nestjs/platform-fastify
```

## Usage (Express or Fastify)

```ts
import { Module } from "@nestjs/common";
import { TraceKitModule } from "@tracekit/nest";

@Module({
  imports: [TraceKitModule.forRoot()]
})
export class AppModule {}
```

### NestJS + Fastify

Use `@tracekit/nest` only. Do not also register `@tracekit/fastify` on the
same application.

```ts
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication
} from "@nestjs/platform-fastify";

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter()
);
```

`TraceKitInterceptor` sets `x-request-id` via `reply.header()` on Fastify and
`response.setHeader()` on Express.

Optional decorator:

```ts
import { Controller, Get } from "@nestjs/common";
import { TraceId } from "@tracekit/nest";

@Controller()
export class AppController {
  @Get("/ping")
  ping(@TraceId() traceId: string | undefined) {
    return { traceId };
  }
}
```

`@TraceId()` returns the active W3C trace ID when a valid `traceparent` is
present.


Repository: [Manavpreeet/tracekit-js](https://github.com/Manavpreeet/tracekit-js)
