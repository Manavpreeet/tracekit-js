# @tracekit/winston

Winston format helper for enriching log records with safe TraceKit fields.

## Install

```bash
pnpm add @tracekit/core @tracekit/winston winston
```

## Usage

```ts
import { createLogger, format, transports } from "winston";
import { traceKitWinstonFormat } from "@tracekit/winston";

const logger = createLogger({
  format: format.combine(traceKitWinstonFormat(), format.json()),
  transports: [new transports.Console()]
});
```

When a trace context exists, the formatter adds:

- `requestId`
- `correlationId`

Repository: [Manavpreeet/tracekit-js](https://github.com/Manavpreeet/tracekit-js)
