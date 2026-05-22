import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import {
  EnvironmentConfigModule,
  DistributedCacheModule,
  GithubRepositoryModule
} from "@mx-tools/common";
import { MetadataSynchronizationCron } from "./crons/metadata-synchronization.cron";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EnvironmentConfigModule,
    DistributedCacheModule,
    GithubRepositoryModule
  ],
  providers: [MetadataSynchronizationCron]
})
export class MetadataSchedulerModule {}
