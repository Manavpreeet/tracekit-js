# TraceKit JS

TraceKit JS is a lightweight, security-first **request correlation** SDK for
Node.js microservices. It keeps a small trace context available across async
work, propagates IDs across HTTP and message boundaries, and enriches logs —
without becoming a full APM product.

**Repository:** [Manavpreeet/tracekit-js](https://github.com/Manavpreeet/tracekit-js)

---

## Table of contents

- [Why use TraceKit](#why-use-tracekit)
- [How it works (diagrams)](#how-it-works-diagrams)
  - [Feature map](#feature-map-all-packages)
  - [Trace context model](#trace-context-model)
  - [Per-package feature diagrams](#per-package-feature-diagrams)
- [TraceKit vs cls-rtracer](#tracekit-vs-cls-rtracer)
- [Packages and adapters](#packages-and-adapters)
- [Security model](#security-model)
- [Architecture](#architecture)
- [Core behavior and configuration](#core-behavior-and-configuration)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Queue and messaging propagation](#queue-and-messaging-propagation)
- [Migrating from cls-rtracer](#migrating-from-cls-rtracer)
- [Performance](#performance)
- [Examples](#examples)
- [Development](#development)

---

## Why use TraceKit

In a distributed system, one user action often crosses multiple HTTP services,
queues, and workers. Without consistent correlation, each service logs in
isolation and incidents take longer to debug.

TraceKit provides:

- **`requestId`** — identifies this hop (often per HTTP request or job)
- **`correlationId`** — stable ID for the broader user/action chain
- **Optional W3C `traceparent`** — `traceId` / `parentId` on ingress when present
- **Safe propagation** — headers, job metadata, and SNS/SQS message attributes

TraceKit is **not** OpenTelemetry, Datadog, or Sentry. It does not collect
spans, metrics dashboards, bodies, or global monkey-patching. Use it for
lightweight correlation; add APM separately if you need waterfalls and service
maps.

```mermaid
flowchart TB
  TK((TraceKit))

  TK --> ING[HTTP ingress]
  ING --> ING1[Express]
  ING --> ING2[NestJS]
  ING --> ING3[Fastify]

  TK --> CORE2[In-process core]
  CORE2 --> C1[AsyncLocalStorage]
  CORE2 --> C2[requestId · correlationId]
  CORE2 --> C3[traceparent optional]

  TK --> OUT2[Outbound]
  OUT2 --> O1[Axios]
  OUT2 --> O2[fetch]

  TK --> ASYNC[Async boundaries]
  ASYNC --> A1[BullMQ]
  ASYNC --> A2[SQS]
  ASYNC --> A3[SNS]

  TK --> LOG2[Logs]
  LOG2 --> L1[Pino]
  LOG2 --> L2[Winston]
```

---

## How it works (diagrams)

### End-to-end distributed flow

A typical platform path: API receives a request, publishes an event, a queue
delivers work, and a worker logs with the same IDs.

```mermaid
flowchart LR
  Client[Client / Browser]
  API[API Service\n@tracekit/nest]
  SNS[Amazon SNS\n@tracekit/sns]
  SQS[Amazon SQS\n@tracekit/sqs]
  Worker[Worker\n@tracekit/bullmq]
  Logs[(Logs\n@tracekit/pino)]

  Client -->|"HTTP + x-request-id"| API
  API -->|"Publish + __tracekit attr"| SNS
  SNS --> SQS
  SQS -->|"processSqsMessageWithTrace"| Worker
  API --> Logs
  Worker --> Logs
```

### In-process architecture

Ingress adapters create context once per request. Everything else reads ALS or
serializes a carrier at boundaries.

```mermaid
flowchart TB
  subgraph ingress [HTTP ingress]
    Express["@tracekit/express"]
    Nest["@tracekit/nest"]
    Fastify["@tracekit/fastify"]
  end

  subgraph core ["@tracekit/core"]
    Create["createTraceContext()"]
    ALS["AsyncLocalStorage"]
    Get["getRequestId() / getCorrelationId()"]
    Carrier["createTraceCarrier()"]
  end

  subgraph egress [Propagation]
    Axios["@tracekit/axios"]
    Fetch["@tracekit/fetch"]
    Bull["@tracekit/bullmq"]
    SQS["@tracekit/sqs"]
    SNS["@tracekit/sns"]
    Pino["@tracekit/pino"]
    Winston["@tracekit/winston"]
  end

  Express --> Create
  Nest --> Create
  Fastify --> Create
  Create --> ALS
  ALS --> Get
  ALS --> Axios
  ALS --> Fetch
  ALS --> Bull
  ALS --> SQS
  ALS --> SNS
  ALS --> Pino
  ALS --> Winston
  Carrier --> Bull
  Carrier --> SQS
  Carrier --> SNS
```

### HTTP request lifecycle

```mermaid
sequenceDiagram
  participant C as Client
  participant M as Ingress middleware
  participant ALS as AsyncLocalStorage
  participant H as Handler
  participant L as Logger
  participant O as Outbound HTTP

  C->>M: Request (optional x-request-id, traceparent)
  M->>M: createTraceContext() + validate IDs
  M->>ALS: runWithTraceContext(context)
  M->>C: x-request-id response header (optional)
  ALS->>H: handle request
  H->>L: log (mixin adds requestId)
  H->>O: injectTraceHeaders()
  O-->>C: downstream call with correlation headers
```

### Carrier at async boundaries

Jobs and messages store a minimal JSON carrier under **`__tracekit`**.

```mermaid
flowchart LR
  Producer[Producer\nactive ALS context]
  Carrier["TraceCarrier\nrequestId, correlationId,\noptional traceId"]
  Transport["Bull job data\nor SQS/SNS MessageAttributes"]
  Consumer[Consumer handler]
  Restore["restoreTraceContext()"]
  ALS2[Worker ALS]

  Producer --> Carrier
  Carrier --> Transport
  Transport --> Consumer
  Consumer --> Restore
  Restore --> ALS2
```

### Feature map (all packages)

Every published package and where it sits in the request lifecycle.

```mermaid
flowchart TB
  subgraph clients [Clients]
    Browser[Browser / Mobile]
    Service[Other microservices]
  end

  subgraph ingress [HTTP ingress adapters]
    EXP["@tracekit/express\ntraceMiddleware"]
    NEST["@tracekit/nest\nTraceKitInterceptor"]
    FAST["@tracekit/fastify\ntracePlugin"]
  end

  CORE["@tracekit/core\ncreateTraceContext · ALS · carriers"]

  subgraph consume [Read context in-process]
    GET["getRequestId()\ngetCorrelationId()"]
  end

  subgraph logs [Log enrichment]
    PINO["@tracekit/pino\nmixin"]
    WIN["@tracekit/winston\nformat"]
  end

  subgraph httpOut [Outbound HTTP]
    AXIOS["@tracekit/axios\ninterceptor"]
    FETCH["@tracekit/fetch\ntraceFetch"]
  end

  subgraph async [Async propagation]
    BULL["@tracekit/bullmq\naddJobWithTrace"]
    SQS["@tracekit/sqs\nenrichSendMessageParams"]
    SNS["@tracekit/sns\nenrichSnsPublishInput"]
  end

  Browser --> EXP
  Browser --> NEST
  Browser --> FAST
  Service --> EXP
  EXP --> CORE
  NEST --> CORE
  FAST --> CORE
  CORE --> GET
  CORE --> PINO
  CORE --> WIN
  CORE --> AXIOS
  CORE --> FETCH
  CORE --> BULL
  CORE --> SQS
  CORE --> SNS
  AXIOS --> Service
  FETCH --> Service
  BULL --> CORE
  SQS --> CORE
  SNS --> SQS
```

### Trace context model

How the three ID types relate on a single hop.

```mermaid
flowchart LR
  subgraph incoming [Incoming HTTP headers]
    TP[traceparent]
    RID[x-request-id]
    CID[x-correlation-id]
  end

  subgraph ctx [TraceContext in ALS]
    R[requestId]
    C[correlationId]
    T[traceId optional]
    P[parentId optional]
  end

  TP -->|parse if valid| T
  TP -->|parse if valid| P
  RID -->|sanitize| R
  CID -->|sanitize| C
  R -.->|default if missing| C
```

### Per-package feature diagrams

#### `@tracekit/core` — context engine

```mermaid
stateDiagram-v2
  [*] --> Incoming: HTTP or restored carrier
  Incoming --> Active: runWithTraceContext
  Active --> Read: getRequestId in handlers
  Active --> Inject: injectTraceHeaders
  Active --> Serialize: createTraceCarrier
  Serialize --> Restored: worker restoreTraceContext
  Restored --> Active
  Active --> [*]: request or job completes
```

#### `@tracekit/express` — Express ingress

```mermaid
sequenceDiagram
  participant Req as express.Request
  participant MW as traceMiddleware
  participant Core as @tracekit/core
  participant Res as express.Response
  participant Next as next()

  Req->>MW: incoming request
  MW->>Core: createTraceContext(headers)
  MW->>Res: setResponseHeader x-request-id
  MW->>Core: runWithTraceContext
  Core->>Next: continue pipeline
  Note over Core: getRequestId() works in routes
```

#### `@tracekit/nest` — NestJS (Express or Fastify)

```mermaid
flowchart TB
  REQ[HTTP request] --> INT[TraceKitInterceptor]
  INT --> CTX[createTraceContext]
  CTX --> ALS[runWithTraceContext]
  ALS --> CTRL[Controllers / Services]
  INT --> HDR{Platform?}
  HDR -->|Express| SET[response.setHeader]
  HDR -->|Fastify| HEAD[reply.header]
  CTRL --> DEC["@TraceId() → traceId from traceparent"]
```

#### `@tracekit/fastify` — standalone Fastify

```mermaid
sequenceDiagram
  participant F as Fastify
  participant P as tracePlugin onRequest
  participant C as @tracekit/core

  F->>P: each request
  P->>C: createTraceContext + enterWithTraceContext
  P->>F: reply.header x-request-id
  Note over C: ALS active for route handlers
```

#### `@tracekit/axios` — outbound Axios

```mermaid
flowchart LR
  APP[Your handler\nALS active] --> INT[request interceptor]
  INT --> INJ[injectTraceHeaders]
  INJ --> OUT[Downstream service\nreceives x-request-id\nand x-correlation-id]
```

#### `@tracekit/fetch` — outbound fetch

```mermaid
flowchart LR
  APP[Your handler] --> TF[traceFetch url options]
  TF --> INJ[injectTraceHeaders on init]
  INJ --> REMOTE[Remote HTTP API]
```

#### `@tracekit/pino` and `@tracekit/winston` — logs

```mermaid
flowchart TB
  LOG[logger.info message] --> MIX{Adapter}
  MIX -->|Pino| PM[traceKitPinoMixin]
  MIX -->|Winston| WF[traceKitWinstonFormat]
  PM --> ALS[(ALS)]
  WF --> ALS
  ALS --> OUT["JSON log line +\nrequestId +\ncorrelationId"]
```

#### `@tracekit/bullmq` — Redis queues

```mermaid
sequenceDiagram
  participant API as API with ALS
  participant Q as Bull Queue
  participant W as Worker

  API->>API: addJobWithTrace
  Note over API,Q: job.data.__tracekit = carrier
  Q->>W: deliver job
  W->>W: processJobWithTrace
  Note over W: restoreTraceContext then handler
  W->>W: getRequestId in job logic
```

#### `@tracekit/sqs` — Amazon SQS

```mermaid
sequenceDiagram
  participant P as Producer
  participant SQS as SQS
  participant C as Consumer

  P->>P: enrichSendMessageParams
  Note over P,SQS: MessageAttributes.__tracekit
  P->>SQS: SendMessage
  SQS->>C: ReceiveMessage
  C->>C: processSqsMessageWithTrace
```

#### `@tracekit/sns` — Amazon SNS

```mermaid
sequenceDiagram
  participant API as Publisher
  participant SNS as SNS Topic
  participant SQS as SQS subscriber

  API->>API: enrichSnsPublishInput
  API->>SNS: Publish + __tracekit attribute
  SNS->>SQS: fan-out with attributes
  Note over SQS: Consumer uses @tracekit/sqs
```

### Service-to-service HTTP chain

Two APIs both running TraceKit — IDs flow through headers only.

```mermaid
sequenceDiagram
  participant A as Service A
  participant B as Service B

  A->>A: ingress creates context
  A->>B: GET + x-request-id + x-correlation-id
  B->>B: ingress honors or extends context
  B-->>A: response
  Note over A,B: Same correlationId across hops
```

### Incoming ID validation

Unsafe client-supplied IDs never enter ALS.

```mermaid
flowchart TD
  H[Header value] --> L{Length OK?}
  L -->|no| GEN[generate safe ID]
  L -->|yes| R{SAFE_ID_REGEX?}
  R -->|no| GEN
  R -->|yes| USE[use sanitized ID]
  GEN --> CTX[TraceContext]
  USE --> CTX
```

---

## TraceKit vs cls-rtracer

Both use **`AsyncLocalStorage`** so you can read an ID anywhere in the async
chain without threading `req` through every function.

| | cls-rtracer | TraceKit |
|---|-------------|----------|
| **Primary goal** | Request ID inside one Node HTTP process | Correlation across HTTP, logs, queues, AWS messaging |
| **Read ID** | `rtracer.id()` | `getRequestId()`, `getCorrelationId()` |
| **Correlation ID** | Not first-class | `correlationId` (defaults to `requestId`) |
| **W3C traceparent** | Not built in | Optional parse → `traceId` / `parentId` |
| **Outgoing HTTP** | Manual | `@tracekit/axios`, `@tracekit/fetch` |
| **Bull / SQS / SNS** | Manual | `@tracekit/bullmq`, `@tracekit/sqs`, `@tracekit/sns` |
| **NestJS module** | Wire middleware yourself | `@tracekit/nest` (Express + Fastify platforms) |
| **Incoming ID validation** | Permissive | Strict safe IDs; invalid values replaced |
| **Typical cost** | Baseline | ~+0.17 MB/process, ~+10–15% ALS micro-ops (negligible vs API latency) |

**When cls-rtracer is enough:** single service, HTTP-only logs, manual queue IDs.

**When TraceKit fits better:** auth → platform → SNS/SQS → Bull workers with the
same IDs in every log line.

```mermaid
flowchart TB
  subgraph cls [cls-rtracer scope]
    C1[HTTP middleware] --> C2[rtracer.id in process]
    C2 --> C3[Manual queue ID copy]
  end

  subgraph tk [TraceKit scope]
    T1[HTTP ingress] --> T2[ALS context]
    T2 --> T3[Logs auto-enriched]
    T2 --> T4[Axios/fetch headers]
    T2 --> T5[Bull / SQS / SNS carriers]
    T5 --> T6[Worker restoreTraceContext]
  end
```

---

## Packages and adapters

Install **only what each service needs** to limit bundle size and memory.

| Package | Use when |
|---------|----------|
| `@tracekit/core` | Any Node.js service; ALS, carriers, header helpers |
| `@tracekit/express` | Express HTTP ingress |
| `@tracekit/nest` | NestJS with **Express or Fastify** platform |
| `@tracekit/fastify` | Standalone Fastify (not Nest + Fastify) |
| `@tracekit/axios` | Axios outgoing requests |
| `@tracekit/fetch` | Native `fetch` outgoing requests |
| `@tracekit/pino` | Pino log mixin |
| `@tracekit/winston` | Winston format |
| `@tracekit/bullmq` | BullMQ producers and workers |
| `@tracekit/sqs` | Amazon SQS send/receive |
| `@tracekit/sns` | Amazon SNS publish |

### NestJS platform matrix

| Your platform | TraceKit package | Notes |
|---------------|------------------|-------|
| `@nestjs/platform-express` | `@tracekit/nest` | Uses `response.setHeader()` |
| `@nestjs/platform-fastify` | `@tracekit/nest` | Uses `reply.header()` — do **not** also register `@tracekit/fastify` |

### Typical stacks

| Service type | Packages |
|--------------|----------|
| Public API (Nest + Fastify) | `core`, `nest`, `pino` |
| API + internal HTTP calls | add `axios` or `fetch` |
| API + background jobs | add `bullmq` or `sqs` |
| Event publisher | add `sns` |
| Queue worker | `core`, `bullmq` or `sqs`, `pino` |

Per-package READMEs live under `packages/*/README.md`.

```mermaid
flowchart LR
  CORE["@tracekit/core"] --> EXPRESS
  CORE --> NEST
  CORE --> FASTIFY
  CORE --> AXIOS
  CORE --> FETCH
  CORE --> PINO
  CORE --> WINSTON
  CORE --> BULLMQ
  CORE --> SQS_PKG
  CORE --> SNS_PKG

  EXPRESS["express"]
  NEST["nest"]
  FASTIFY["fastify"]
  AXIOS["axios"]
  FETCH["fetch"]
  PINO["pino"]
  WINSTON["winston"]
  BULLMQ["bullmq"]
  SQS_PKG["sqs"]
  SNS_PKG["sns"]
```

### Typical deployment topology

```mermaid
flowchart TB
  GW[Gateway / Auth\nnest + pino] --> PLAT[Platform API\nnest + axios]
  PLAT --> SNSP[sns publish]
  SNSP --> SQSC[sqs consumer]
  PLAT --> BULLQ[bullmq enqueue]
  SQSC --> WRK1[Worker sqs + pino]
  BULLQ --> WRK2[Worker bullmq + pino]
```

---

## Security model

TraceKit follows a **conservative** model: correlate safely, never exfiltrate
sensitive request data by default.

### What is stored in context

Only small correlation fields in `AsyncLocalStorage`:

- `requestId`, `correlationId`
- optional `traceId`, `parentId` (from valid `traceparent`)
- `source`, `startedAt`

### What is never captured automatically

- `authorization`, `cookie`, API keys, JWTs
- Request or response **bodies**
- Email, phone, session identifiers

### Incoming IDs

- Validated with `SAFE_ID_REGEX` and `maxHeaderLength` (default 128)
- Invalid or unsafe incoming values are **ignored** and replaced with generated IDs

### Outgoing propagation

By default only these headers are injected:

- `x-request-id`
- `x-correlation-id`

Set `overwriteOutgoingHeaders: true` only when you intentionally need to replace
existing values.

### Queues and messaging

The `__tracekit` carrier must contain **only** correlation fields. Never put
PII, tokens, or JWTs in job metadata or message attributes.

### Logging

- `exposeSensitiveDataInLogs: false` (default)
- Use `sensitiveLogAllowlist` only after an explicit compliance review

```mermaid
flowchart TB
  subgraph allowed [Allowed in context and carriers]
    RID2[requestId]
    CID2[correlationId]
    TID[traceId / parentId]
  end

  subgraph blocked [Never stored by TraceKit]
    AUTH[Authorization / cookies]
    BODY[Request / response body]
    PII[PII / JWT / API keys]
  end

  HTTP[HTTP request] -->|sanitize headers only| allowed
  HTTP -.->|ignored| blocked
  allowed -->|x-request-id x-correlation-id| OUT[Outbound headers]
  allowed -->|__tracekit JSON| QUEUE[Queues / SNS / SQS]
```

---

## Architecture

### Layers

1. **Ingress** — Express, Nest, or Fastify adapter calls `createTraceContext()`
   from incoming headers, then `runWithTraceContext()`.
2. **Core** — `AsyncLocalStorage` holds `TraceContext` for the lifetime of the
   request or restored job.
3. **Egress** — Log mixins read ALS; HTTP clients call `injectTraceHeaders()`;
   queue/messaging helpers attach `__tracekit` carriers.

### Propagation rules

| Step | Mechanism |
|------|-----------|
| HTTP ingress | Parse headers → `createTraceContext()` → ALS |
| In-process | `getRequestId()` / `getCorrelationId()` |
| HTTP egress | `injectTraceHeaders()` on axios/fetch |
| Async boundary | `createTraceCarrier()` → `__tracekit` on job or message attribute |
| Worker | `restoreTraceContext({ trace })` → `runWithTraceContext()` |

```mermaid
flowchart TD
  subgraph layer1 [1. Ingress]
    I1[Read headers]
    I2[createTraceContext]
    I3[runWithTraceContext]
    I1 --> I2 --> I3
  end

  subgraph layer2 [2. Core ALS]
    A1[TraceContext store]
  end

  subgraph layer3 [3. Egress]
    E1[Logs]
    E2[HTTP clients]
    E3[Queues / messaging]
  end

  layer1 --> layer2
  layer2 --> layer3
```

### Custom transports

Use `@tracekit/core` directly:

```ts
import {
  createTraceCarrier,
  extractTraceCarrierFromMessageAttributes,
  getTraceContext,
  injectTraceMessageAttributes,
  restoreTraceContext,
  runWithTraceContext
} from "@tracekit/core";
```

---

## Core behavior and configuration

### Context shape

```ts
type TraceContext = {
  requestId: string;
  correlationId: string;
  traceId?: string;
  parentId?: string;
  source: "incoming" | "generated" | "restored";
  startedAt: number;
};
```

### Incoming header resolution order

1. Valid W3C `traceparent` (when `respectTraceparent: true`)
2. Valid request header (`requestHeaderName`, default `x-request-id`)
3. Valid correlation header (`correlationHeaderName`, default `x-correlation-id`)
4. Generated safe IDs

```mermaid
flowchart TD
  START[Incoming request] --> TP{Valid traceparent?}
  TP -->|yes| PARSE[Set traceId + parentId]
  TP -->|no| REQ
  PARSE --> REQ{Valid x-request-id?}
  REQ -->|yes| RUSE[Use requestId]
  REQ -->|no| RGEN[Generate requestId]
  RUSE --> CORR
  RGEN --> CORR{Valid x-correlation-id?}
  CORR -->|yes| CUSE[Use correlationId]
  CORR -->|no| CDEF[correlationId = requestId]
  CUSE --> DONE[TraceContext in ALS]
  CDEF --> DONE
```

### Configuration options

| Option | Default | Purpose |
|--------|---------|---------|
| `requestHeaderName` | `x-request-id` | Incoming/outgoing request ID header |
| `correlationHeaderName` | `x-correlation-id` | Correlation header |
| `responseHeaderName` | `x-request-id` | Response header when exposed |
| `exposeResponseHeader` | `true` | Set response header on ingress |
| `allowIncomingRequestId` | `true` | Honor safe incoming request IDs |
| `respectTraceparent` | `true` | Parse W3C trace context |
| `generator` | `"uuid"` | `"uuid"`, `"nanoid"`, or custom function |
| `maxHeaderLength` | `128` | Max length for sanitized IDs |
| `overwriteOutgoingHeaders` | `false` | Replace existing outbound headers |

Example — internal API with no response header or traceparent parsing:

```ts
TraceKitModule.forRoot({
  respectTraceparent: false,
  exposeResponseHeader: false
});
```

### Core API reference

| Function | Role |
|----------|------|
| `createTraceContext()` | Build context from incoming headers |
| `runWithTraceContext()` | Run callback inside ALS |
| `enterWithTraceContext()` | Fastify-style enter (used by fastify plugin) |
| `getTraceContext()` | Read full context |
| `getRequestId()` / `getCorrelationId()` | Read IDs |
| `injectTraceHeaders()` | Merge IDs into outbound header map |
| `createTraceCarrier()` | Serialize for queues/messages |
| `restoreTraceContext()` | Rebuild context in workers |
| `setResponseHeader()` | Express `setHeader` or Fastify `header` |

---

## Installation

**Requirements:** Node.js `>=18.18.0`

### Published packages

```bash
# Minimal HTTP API
pnpm add @tracekit/core @tracekit/express @tracekit/pino

# Service-to-service HTTP
pnpm add @tracekit/core @tracekit/express @tracekit/axios

# NestJS (Express or Fastify platform)
pnpm add @tracekit/core @tracekit/nest

# Queues
pnpm add @tracekit/core @tracekit/bullmq

# AWS messaging
pnpm add @tracekit/core @tracekit/sqs @tracekit/sns
```

### Monorepo development

```bash
git clone https://github.com/Manavpreeet/tracekit-js.git
cd tracekit-js
pnpm install
pnpm build
```

---

## Quick start

The diagrams in [Per-package feature diagrams](#per-package-feature-diagrams) show
how each adapter participates in the same ALS context. Below are minimal code
snippets for each.

### Express

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

### NestJS (Express or Fastify)

```ts
import { Module } from "@nestjs/common";
import { TraceKitModule } from "@tracekit/nest";

@Module({
  imports: [TraceKitModule.forRoot()]
})
export class AppModule {}
```

Fastify platform:

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
await app.listen(3000);
```

`@TraceId()` decorator — returns W3C `traceId` when a valid `traceparent` is present:

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

### Standalone Fastify

Do **not** use this together with `@tracekit/nest` on the same app.

```ts
import Fastify from "fastify";
import { tracePlugin } from "@tracekit/fastify";

const app = Fastify();
await app.register(tracePlugin);
```

### Pino

```ts
import pino from "pino";
import { traceKitPinoMixin } from "@tracekit/pino";

const logger = pino({ mixin: traceKitPinoMixin });
```

### Winston

```ts
import winston from "winston";
import { traceKitWinstonFormat } from "@tracekit/winston";

const logger = winston.createLogger({
  format: winston.format.combine(traceKitWinstonFormat(), winston.format.json())
});
```

### Axios

```ts
import axios from "axios";
import { attachTraceKitAxiosInterceptor } from "@tracekit/axios";

const client = axios.create();
attachTraceKitAxiosInterceptor(client);
```

### Fetch

```ts
import { traceFetch } from "@tracekit/fetch";

const response = await traceFetch("https://service-b.internal/users");
```

---

## Queue and messaging propagation

The **`__tracekit`** key carries a minimal JSON `TraceCarrier`:

`{ requestId, correlationId, traceId?, parentId? }`

```mermaid
flowchart TB
  subgraph http [HTTP tier]
    API[API service]
  end

  subgraph transports [Transport choice]
    BULL_T[BullMQ job.data]
    SNS_T[SNS MessageAttributes]
    SQS_T[SQS MessageAttributes]
  end

  subgraph workers [Worker tier]
    WB[Bull worker]
    WS[SQS consumer]
  end

  API --> BULL_T --> WB
  API --> SNS_T --> SQS_T --> WS
  API --> SQS_T
```

### BullMQ

Metadata is embedded in **job data** (not Redis headers).

```ts
import { Worker } from "bullmq";
import { addJobWithTrace, processJobWithTrace } from "@tracekit/bullmq";
import { getRequestId } from "@tracekit/core";

await addJobWithTrace(queue, "send-email", { template: "welcome" });

new Worker(
  "send-email",
  processJobWithTrace(async () => {
    console.log(getRequestId());
  }),
  { connection }
);
```

### Amazon SQS

Carrier is stored in **`MessageAttributes.__tracekit`** (String, JSON).

```ts
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { getRequestId } from "@tracekit/core";
import {
  enrichSendMessageParams,
  processSqsMessageWithTrace
} from "@tracekit/sqs";

const sqs = new SQSClient({});

await sqs.send(
  new SendMessageCommand(
    enrichSendMessageParams({
      QueueUrl: process.env.QUEUE_URL,
      MessageBody: JSON.stringify({ action: "sync" })
    })
  )
);

const handleMessage = processSqsMessageWithTrace(async () => {
  console.log(getRequestId());
});
```

### Amazon SNS

Same **`__tracekit`** message attribute on publish. When SNS fans out to SQS,
ensure attributes are forwarded; consumers use `@tracekit/sqs` to restore context.

```ts
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { enrichSnsPublishInput } from "@tracekit/sns";

const sns = new SNSClient({});

await sns.send(
  new PublishCommand(
    enrichSnsPublishInput({
      TopicArn: process.env.TOPIC_ARN,
      Message: JSON.stringify({ action: "notify" })
    })
  )
);
```

---

## Migrating from cls-rtracer

```mermaid
flowchart LR
  subgraph bad [Avoid dual ALS]
    R1[cls-rtracer ALS]
    R2[TraceKit ALS]
    R1 -.->|mismatched IDs| APP1[Application code]
    R2 -.-> APP1
  end

  subgraph good [Target state]
    TK[TraceKit only]
    TK --> APP2[Single source of truth]
  end

  bad -->|remove cls-rtracer| good
```

### API mapping

| cls-rtracer | TraceKit |
|-------------|----------|
| `rtracer.expressMiddleware()` | `traceMiddleware()` (`@tracekit/express`) |
| Nest manual middleware | `TraceKitModule.forRoot()` (`@tracekit/nest`) |
| Fastify hook | `tracePlugin` (`@tracekit/fastify`) |
| `rtracer.id()` | `getRequestId()` |
| `rtracer.id({ useHeader: false })` | `createTraceContext()` with config |
| Winston format | `traceKitWinstonFormat()` |
| Manual worker context | `processJobWithTrace()` / `processSqsMessageWithTrace()` |

### Avoid dual ALS

Do **not** run cls-rtracer and TraceKit together long term. That loads two
context systems (~**0.35 MB** extra per process) and can produce **mismatched
IDs** if some code still calls `rtracer.id()`.

Remove cls-rtracer from:

1. HTTP middleware and guards
2. Winston/Pino formatters
3. `package.json` after grep shows zero imports

### Rollout checklist

1. Enable TraceKit ingress on one service (gateway or auth).
2. Switch logs to `@tracekit/pino` or `@tracekit/winston`.
3. Add axios/fetch interceptors for outbound HTTP.
4. Wrap Bull/SQS/SNS producers and consumers.
5. Remove cls-rtracer.
6. Verify end-to-end: HTTP → SNS/SQS → worker logs share `requestId`.

### Verification

- [ ] Safe incoming `x-request-id` is honored
- [ ] Response `x-request-id` when `exposeResponseHeader` is enabled
- [ ] `getRequestId()` works in controllers/services without manual middleware
- [ ] Queue and messaging handlers restore context
- [ ] No remaining `cls-rtracer` imports

---

## Performance

TraceKit is designed to stay **negligible** compared to framework, database,
and network time. Treat microbenchmarks as order-of-magnitude signals, not
production APM.

```mermaid
pie title Typical 50ms API request time budget
  "Business logic + DB" : 49.95
  "TraceKit ALS + headers" : 0.05
```

```mermaid
flowchart LR
  subgraph cost [Where TraceKit spends time]
    ALS[ALS enter/read]
    HDR[Header read/write]
    CAR[Carrier JSON on boundaries]
  end

  subgraph savings [Reduce load]
    S1[One tracing library]
    S2[Packages per service only]
    S3[Carriers on cross-service messages only]
  end

  cost --> savings
```

### Compared to cls-rtracer alone

| Area | Typical impact | Action |
|------|----------------|--------|
| Memory (full swap) | ~+0.17 MB / process | No change needed |
| Memory (both libraries during migration) | ~+0.35 MB / process | Remove cls-rtracer |
| HTTP ALS enter + read | ~+10–15% (~0.007 µs) | No change needed |
| Bull/SQS carrier | sub-µs per message | Use only on boundaries |

At 10,000 HTTP requests, ALS overhead is **under 1 ms** total — roughly
**0.0001%** of a 50 ms API call.

### Minimizing load

| Resource | Highest-impact practices |
|----------|-------------------------|
| **CPU** | One ingress adapter; `respectTraceparent: false` if unused; reduce log volume; don’t call `getRequestId()` in tight loops |
| **Memory** | Single tracing library; install only needed packages; no duplicate context on `req` |
| **Network** | Two small headers on HTTP; put `__tracekit` only on **cross-service** messages, not every internal enqueue |

### Benchmarks (repo root)

```bash
pnpm benchmark          # core: context, ALS, header injection
pnpm benchmark:compare  # TraceKit vs cls-rtracer ALS
pnpm size-check         # dist/ size per package
```

Escalate only if production p95 regresses **>1%** attributable to TraceKit, or
heap grows **>5 MB** with TraceKit alone after cls-rtracer is removed.

---

## Examples

| Example | Path |
|---------|------|
| Express basic | `examples/express-basic` |
| Service-to-service HTTP | `examples/express-service-to-service` |
| BullMQ API + worker | `examples/bullmq-worker` |
| NestJS | `examples/nest-basic` |

```bash
pnpm --filter @tracekit-example/express-basic start
pnpm --filter @tracekit-example/express-service-to-service service:a
pnpm --filter @tracekit-example/express-service-to-service service:b
pnpm --filter @tracekit-example/nest-basic start
pnpm --filter @tracekit-example/bullmq-worker api
pnpm --filter @tracekit-example/bullmq-worker worker
```

BullMQ example uses `REDIS_URL` (default `redis://127.0.0.1:6379`).

---

## Development

```bash
pnpm install
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm benchmark
pnpm benchmark:compare
pnpm size-check
pnpm pack:check      # validate npm tarballs in .pack/
pnpm release:check   # lint + test + typecheck + pack
```

---

## Current status

TraceKit JS is a pnpm monorepo with published-style packages, tests, examples,
and pack validation. Configure npm scope (`@tracekit`), CI, and publish workflow
before releasing to the public registry.
