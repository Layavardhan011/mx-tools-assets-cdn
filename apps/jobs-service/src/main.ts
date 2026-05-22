import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { MetadataSchedulerModule } from "./metadata-scheduler.module";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const logger = new Logger("CronBootstrap");
  await NestFactory.createApplicationContext(MetadataSchedulerModule);
  logger.log("Headless background metadata-synchronization offline cron service is fully running...");
}

bootstrap();
