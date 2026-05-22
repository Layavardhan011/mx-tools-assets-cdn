import { Module } from "@nestjs/common";
import {
  EnvironmentConfigModule,
  DistributedCacheModule,
  GithubRepositoryModule
} from "@mx-tools/common";
import { AssetsCdnProxyController } from "./controllers/assets-cdn-proxy.controller";
import { AssetsCdnProxyService } from "./services/assets-cdn-proxy.service";

@Module({
  imports: [
    EnvironmentConfigModule,
    DistributedCacheModule,
    GithubRepositoryModule
  ],
  controllers: [AssetsCdnProxyController],
  providers: [AssetsCdnProxyService]
})
export class AssetsCdnApiModule {}
