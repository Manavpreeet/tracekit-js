# @tracekit/axios

Axios request interceptor for propagating TraceKit headers to downstream
services.

## Install

```bash
pnpm add @tracekit/core @tracekit/axios axios
```

## Usage

```ts
import axios from "axios";
import { attachTraceKitAxiosInterceptor } from "@tracekit/axios";

const client = axios.create();

attachTraceKitAxiosInterceptor(client);
```

By default, the interceptor injects:

- `x-request-id`
- `x-correlation-id`

Existing outgoing headers are preserved unless
`overwriteOutgoingHeaders: true` is enabled.

Repository: [Manavpreeet/tracekit-js](https://github.com/Manavpreeet/tracekit-js)
