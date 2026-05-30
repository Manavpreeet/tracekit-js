import { normalizeConfig, type TraceKitConfig } from "@tracekit/core";
import { Module, type DynamicModule } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { TRACEKIT_MODULE_OPTIONS } from "./constants";
import { TraceKitInterceptor } from "./tracekit.interceptor";

@Module({})
export class TraceKitModule {
  static forRoot(config?: TraceKitConfig): DynamicModule {
    return {
      exports: [TRACEKIT_MODULE_OPTIONS],
      global: true,
      module: TraceKitModule,
      providers: [
        {
          provide: TRACEKIT_MODULE_OPTIONS,
          useValue: normalizeConfig(config)
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: TraceKitInterceptor
        }
      ]
    };
  }
}
