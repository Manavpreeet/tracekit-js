# @tracekit/express

Express middleware for TraceKit request correlation.

## Install

```bash
pnpm add @tracekit/core @tracekit/express express
```

## Usage

```ts
import express from "express";
import { getRequestId } from "@tracekit/core";
import { traceMiddleware } from "@tracekit/express";

const app = express();

app.use(traceMiddleware());

app.get("/ping", async (_request, response) => {
  await Promise.resolve();

  response.json({
    requestId: getRequestId()
  });
});
```

The middleware creates a request context from incoming headers, stores it in
`AsyncLocalStorage`, and optionally sets the response request ID header.

Repository: [Manavpreeet/tracekit-js](https://github.com/Manavpreeet/tracekit-js)
