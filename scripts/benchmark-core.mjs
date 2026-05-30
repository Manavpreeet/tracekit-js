import { performance } from "node:perf_hooks";

const { createTraceContext, injectTraceHeaders, runWithTraceContext } =
  await import("../packages/core/dist/index.js");

function averageMs(totalMs, iterations) {
  return Number((totalMs / iterations).toFixed(6));
}

function measure(name, iterations, callback) {
  const start = performance.now();

  for (let index = 0; index < iterations; index += 1) {
    callback(index);
  }

  const durationMs = performance.now() - start;

  return {
    avgMs: averageMs(durationMs, iterations),
    iterations,
    name,
    totalMs: Number(durationMs.toFixed(3))
  };
}

const iterations = 10_000;
const contextCreation = measure("createTraceContext", iterations, (index) => {
  createTraceContext({
    headers: {
      "x-correlation-id": `corr_${index}`,
      "x-request-id": `req_${index}`
    }
  });
});
const headerInjection = measure("injectTraceHeaders", iterations, (index) => {
  const context = createTraceContext({
    headers: {
      "x-request-id": `req_${index}`
    }
  });

  runWithTraceContext(context, () => {
    injectTraceHeaders({
      headers: {
        "x-custom": "value"
      }
    });
  });
});
const alsOverhead = measure("runWithTraceContext", iterations, (index) => {
  const context = createTraceContext({
    headers: {
      "x-request-id": `req_${index}`
    }
  });

  runWithTraceContext(context, () => context.requestId);
});

console.log("TraceKit core benchmark");
console.log(JSON.stringify([contextCreation, headerInjection, alsOverhead], null, 2));
