import axios from "axios";
import express from "express";
import { getRequestId } from "@tracekit/core";
import { attachTraceKitAxiosInterceptor } from "@tracekit/axios";
import { traceMiddleware } from "@tracekit/express";
import { traceKitPinoMixin } from "@tracekit/pino";
import pino from "pino";

const app = express();
const logger = pino({
  mixin: traceKitPinoMixin
});
const port = Number(process.env.PORT ?? 3001);
const serviceBUrl = process.env.SERVICE_B_URL ?? "http://localhost:3002/users";
const httpClient = axios.create();

attachTraceKitAxiosInterceptor(httpClient);

app.use(traceMiddleware());
app.get("/call", async (_request, response) => {
  logger.info("service-a calling service-b");

  const downstream = await httpClient.get(serviceBUrl);

  response.json({
    downstream: downstream.data,
    requestId: getRequestId(),
    service: "service-a"
  });
});

app.listen(port, () => {
  logger.info({ port, serviceBUrl }, "service-a listening");
});
