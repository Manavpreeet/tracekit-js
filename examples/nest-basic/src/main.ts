import "reflect-metadata";

import { getRequestId } from "@tracekit/core";
import { Controller, Get, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { TraceId, TraceKitModule } from "@tracekit/nest";

@Controller()
class AppController {
  @Get("/ping")
  async ping(@TraceId() traceId: string | undefined) {
    await Promise.resolve();

    return {
      decoratorTraceId: traceId,
      requestId: getRequestId()
    };
  }
}

@Module({
  controllers: [AppController],
  imports: [TraceKitModule.forRoot()]
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3004);

  await app.listen(port);
  console.log(`nest-basic example listening on ${port}`);
}

void bootstrap();
