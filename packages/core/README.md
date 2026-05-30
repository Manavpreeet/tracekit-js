# @tracekit/core

Framework-agnostic TraceKit primitives for safe request correlation in Node.js
services.

## Install

```bash
pnpm add @tracekit/core
```

## What it provides

- `createTraceContext()`
- `restoreTraceContext()`
- `runWithTraceContext()`
- `getTraceContext()`
- `getRequestId()`
- `getCorrelationId()`
- `injectTraceHeaders()`
- `setResponseHeader()` (Express and Fastify reply objects)
- `injectTraceMessageAttributes()` / `extractTraceCarrierFromMessageAttributes()`

## Example

```ts
import {
  createTraceContext,
  getRequestId,
  runWithTraceContext
} from "@tracekit/core";

const context = createTraceContext({
  headers: {
    "x-request-id": "req_123"
  }
});

await runWithTraceContext(context, async () => {
  console.log(getRequestId());
});
```

## Notes

- Stores only a minimal safe trace context
- Rejects invalid incoming IDs conservatively
- Does not capture sensitive request data automatically

Repository: [Manavpreeet/tracekit-js](https://github.com/Manavpreeet/tracekit-js)
