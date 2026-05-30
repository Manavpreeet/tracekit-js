# @tracekit/bullmq

BullMQ helpers for carrying TraceKit request correlation through queue and
worker boundaries.

## Install

```bash
pnpm add @tracekit/core @tracekit/bullmq bullmq
```

## Usage

```ts
import { Worker } from "bullmq";
import { addJobWithTrace, processJobWithTrace } from "@tracekit/bullmq";

await addJobWithTrace(queue, "send-email", {
  template: "welcome-email"
});

const worker = new Worker(
  "send-email",
  processJobWithTrace(async (job) => {
    console.log(job.id);
  }),
  { connection }
);
```

The package stores minimal metadata under `__tracekit` and restores a safe
context in workers.

Repository: [Manavpreeet/tracekit-js](https://github.com/Manavpreeet/tracekit-js)
