import { Module } from "@nestjs/common";
import { EnvironmentConfigModule } from "../config/environment-config.module";
import { DistributedCacheService } from "./distributed-cache.service";

@Module({
  imports: [EnvironmentConfigModule],
  providers: [DistributedCacheService],
  exports: [DistributedCacheService]
})
export class DistributedCacheModule {}
