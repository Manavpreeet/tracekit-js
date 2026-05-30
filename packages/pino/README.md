# @tracekit/pino

Pino mixin helper for adding safe TraceKit fields to log lines.

## Install

```bash
pnpm add @tracekit/core @tracekit/pino pino
```

## Usage

```ts
import pino from "pino";
import { traceKitPinoMixin } from "@tracekit/pino";

const logger = pino({
  mixin: traceKitPinoMixin
});
```

When a trace context exists, the mixin adds:

- `requestId`
- `correlationId`

Repository: [Manavpreeet/tracekit-js](https://github.com/Manavpreeet/tracekit-js)
