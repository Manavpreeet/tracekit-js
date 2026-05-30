import { Worker } from "bullmq";
import IORedis from "ioredis";
import { getRequestId } from "@tracekit/core";
import { processJobWithTrace } from "@tracekit/bullmq";
import { traceKitPinoMixin } from "@tracekit/pino";
import pino from "pino";

const logger = pino({
  mixin: traceKitPinoMixin
});
const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null
});

const worker = new Worker(
  "tracekit-email",
  processJobWithTrace(async (job) => {
    await Promise.resolve();

    logger.info({ jobId: job.id }, "processing tracekit-email job");

    return {
      requestId: getRequestId()
    };
  }),
  {
    connection
  }
);

worker.on("completed", (job) => {
  logger.info(
    {
      jobId: job.id
    },
    "completed tracekit-email job"
  );
});

worker.on("failed", (job, error) => {
  logger.error(
    {
      error,
      jobId: job?.id
    },
    "failed tracekit-email job"
  );
});

logger.info({ redisUrl }, "bullmq worker example listening");
