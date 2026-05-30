import { Queue } from "bullmq";
import express from "express";
import IORedis from "ioredis";
import { getRequestId } from "@tracekit/core";
import { addJobWithTrace } from "@tracekit/bullmq";
import { traceMiddleware } from "@tracekit/express";
import { traceKitPinoMixin } from "@tracekit/pino";
import pino from "pino";

const app = express();
const logger = pino({
  mixin: traceKitPinoMixin
});
const port = Number(process.env.PORT ?? 3003);
const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null
});
const queue = new Queue("tracekit-email", {
  connection
});

app.use(traceMiddleware());
app.post("/jobs/send-email", async (_request, response) => {
  const job = await addJobWithTrace(queue, "send-email", {
    template: "welcome-email"
  });

  logger.info({ jobId: job.id }, "queued send-email job");
  response.json({
    jobId: job.id,
    requestId: getRequestId()
  });
});

app.listen(port, () => {
  logger.info({ port, redisUrl }, "bullmq api example listening");
});
