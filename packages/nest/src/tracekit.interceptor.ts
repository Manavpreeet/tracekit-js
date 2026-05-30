import {
  createTraceContext,
  DEFAULT_CONFIG,
  normalizeConfig,
  runWithTraceContext,
  setResponseHeader,
  type HeaderMap,
  type ResponseLike,
  type TraceKitConfig,
  type TraceKitResolvedConfig
} from "@tracekit/core";
import {
  Inject,
  Injectable,
  Optional
} from "@nestjs/common";
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor
} from "@nestjs/common";
import { Observable } from "rxjs";

import { TRACEKIT_MODULE_OPTIONS } from "./constants";

@Injectable()
export class TraceKitInterceptor implements NestInterceptor {
  private readonly resolvedConfig: TraceKitResolvedConfig;

  constructor(
    @Optional()
    @Inject(TRACEKIT_MODULE_OPTIONS)
    config?: TraceKitConfig | TraceKitResolvedConfig
  ) {
    this.resolvedConfig = config ? normalizeConfig(config) : DEFAULT_CONFIG;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<{ headers: HeaderMap }>();
    const response = httpContext.getResponse<ResponseLike>();
    const traceContext = createTraceContext({
      config: this.resolvedConfig,
      headers: request.headers
    });

    if (this.resolvedConfig.exposeResponseHeader) {
      setResponseHeader(
        response,
        this.resolvedConfig.responseHeaderName,
        traceContext.requestId
      );
    }

    return new Observable((subscriber) => {
      const innerSubscription = runWithTraceContext(traceContext, () =>
        next.handle().subscribe({
          complete: () => subscriber.complete(),
          error: (error) => subscriber.error(error),
          next: (value) => subscriber.next(value)
        })
      );

      return () => {
        innerSubscription.unsubscribe();
      };
    });
  }
}
