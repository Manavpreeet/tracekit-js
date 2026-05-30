import express from "express";
import { getRequestId } from "@tracekit/core";
import { traceMiddleware } from "@tracekit/express";
import { traceKitPinoMixin } from "@tracekit/pino";
import pino from "pino";

const app = express();
const logger = pino({
  mixin: traceKitPinoMixin
});
const port = Number(process.env.PORT ?? 3000);

app.use(traceMiddleware());
app.get("/ping", async (_request, response) => {
  await Promise.resolve();

  logger.info("handling /ping");
  response.json({
    requestId: getRequestId()
  });
});

app.listen(port, () => {
  logger.info({ port }, "express-basic example listening");
});
