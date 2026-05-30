import { performance } from "node:perf_hooks";

const iterations = 100_000;

const {
  createTraceCarrier,
  createTraceContext,
  getRequestId,
  getTraceContext,
  injectTraceMessageAttributes,
  runWithTraceContext
} = await import("../packages/core/dist/index.js");
const clsRtracer = await import("cls-rtracer");

function averageUs(totalMs, count) {
  return Number(((totalMs * 1000) / count).toFixed(3));
}

function measure(name, callback) {
  const start = performance.now();

  for (let index = 0; index < iterations; index += 1) {
    callback(index);
  }

  const totalMs = performance.now() - start;

  return {
    avgUs: averageUs(totalMs, iterations),
    iterations,
    name,
    totalMs: Number(totalMs.toFixed(3))
  };
}

const traceContext = createTraceContext({
  headers: {
    "x-request-id": "req_benchmark"
  }
});

const traceKitEnterAndRead = measure("tracekit: enter + read requestId", () => {
  runWithTraceContext(traceContext, () => {
    getRequestId();
  });
});

let traceKitReadOnly;

runWithTraceContext(traceContext, () => {
  traceKitReadOnly = measure("tracekit: read requestId in active context", () => {
    getRequestId();
  });
});

const clsEnterAndRead = measure("cls-rtracer: runWithId + read id", () => {
  clsRtracer.runWithId(() => {
    clsRtracer.id();
  });
});

const traceKitCarrier = measure("tracekit: createTraceCarrier", () => {
  runWithTraceContext(traceContext, () => {
    createTraceCarrier(getTraceContext());
  });
});

const traceKitSqsAttributes = measure("tracekit: injectTraceMessageAttributes", () => {
  runWithTraceContext(traceContext, () => {
    injectTraceMessageAttributes();
  });
});

console.log("TraceKit vs cls-rtracer (local microbenchmark, not production APM)");
console.log(
  JSON.stringify(
    {
      note: "Order-of-magnitude comparison on Node 22+. HTTP context cost is negligible vs typical API latency.",
      results: [
        traceKitEnterAndRead,
        clsEnterAndRead,
        {
          name: "delta: enter + read (tracekit vs cls-rtracer)",
          avgUs: Number(
            (traceKitEnterAndRead.avgUs - clsEnterAndRead.avgUs).toFixed(3)
          ),
          percentSlower: Number(
            (
              ((traceKitEnterAndRead.avgUs - clsEnterAndRead.avgUs) /
                clsEnterAndRead.avgUs) *
              100
            ).toFixed(1)
          )
        },
        traceKitReadOnly,
        traceKitCarrier,
        traceKitSqsAttributes
      ]
    },
    null,
    2
  )
);
