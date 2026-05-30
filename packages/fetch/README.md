# @tracekit/fetch

Native fetch wrapper for propagating TraceKit request headers.

## Install

```bash
pnpm add @tracekit/core @tracekit/fetch
```

## Usage

```ts
import { traceFetch } from "@tracekit/fetch";

await traceFetch("https://service-b.internal/users");
```

`traceFetch()` safely merges outgoing headers from the active TraceKit context
without forwarding arbitrary incoming headers.

Repository: [Manavpreeet/tracekit-js](https://github.com/Manavpreeet/tracekit-js)
