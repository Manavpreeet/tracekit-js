# TraceKit JS

Lightweight, security-first **request correlation** for Node.js microservices.
Keeps `requestId` and `correlationId` in `AsyncLocalStorage` and propagates them
across HTTP, queues, and logs — without APM overhead.

**Repository:** [Manavpreeet/tracekit-js](https://github.com/Manavpreeet/tracekit-js)

## Packages

Install only what you need. Node.js `>=18.18.0`.

| Package | Purpose |
|---------|---------|
| `@tracekit/core` | ALS, context, carriers, headers |
| `@tracekit/express` | Express middleware |
| `@tracekit/nest` | NestJS (Express or Fastify) |
| `@tracekit/fastify` | Standalone Fastify |
| `@tracekit/axios` / `@tracekit/fetch` | Outgoing HTTP |
| `@tracekit/pino` / `@tracekit/winston` | Log fields |
| `@tracekit/bullmq` | BullMQ jobs |
| `@tracekit/sqs` / `@tracekit/sns` | AWS messaging |

Each package has install steps and examples in `packages/*/README.md`.

## Quick start

```bash
pnpm add @tracekit/core @tracekit/express
```

```ts
import express from "express";
import { getRequestId } from "@tracekit/core";
import { traceMiddleware } from "@tracekit/express";

const app = express();
app.use(traceMiddleware());

app.get("/ping", (_req, res) => {
  res.json({ requestId: getRequestId() });
});
```

## Examples

Runnable apps live in `examples/`:

```bash
pnpm install && pnpm build
pnpm --filter @tracekit-example/express-basic start
```

## Development

```bash
pnpm install && pnpm build && pnpm test
```

Not OpenTelemetry or Datadog — add APM separately if you need full tracing.
Migrating from `cls-rtracer`? Replace `rtracer.id()` with `getRequestId()` and
remove cls-rtracer so you do not run two ALS systems.
