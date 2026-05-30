# @tracekit/fastify

Fastify plugin for TraceKit request correlation.

## Install

```bash
pnpm add @tracekit/core @tracekit/fastify fastify
```

## Usage

```ts
import Fastify from "fastify";
import { tracePlugin } from "@tracekit/fastify";

const app = Fastify();

await app.register(tracePlugin);
```

The plugin creates request context at ingress so both hooks and handlers can
read TraceKit state through `@tracekit/core`.

Repository: [Manavpreeet/tracekit-js](https://github.com/Manavpreeet/tracekit-js)
