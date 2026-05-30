import express from "express";
import { getRequestId } from "@tracekit/core";
import { traceMiddleware } from "@tracekit/express";
import { traceKitPinoMixin } from "@tracekit/pino";
import pino from "pino";

const app = express();
const logger = pino({
  mixin: traceKitPinoMixin
});
const port = Number(process.env.PORT ?? 3002);

app.use(traceMiddleware());
app.get("/users", (_request, response) => {
  logger.info("service-b received downstream request");
  response.json({
    requestId: getRequestId(),
    service: "service-b"
  });
});

app.listen(port, () => {
  logger.info({ port }, "service-b listening");
});
