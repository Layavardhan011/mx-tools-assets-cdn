import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import {
  EnvironmentConfigModule,
  DistributedCacheModule,
  GithubRepositoryModule
} from "@mx-tools/common";
import { AssetsCdnProxyController } from "./controllers/assets-cdn-proxy.controller";
import { AssetsCdnProxyService } from "./services/assets-cdn-proxy.service";
import { CdnHeaderInjectionMiddleware } from "./middlewares/cdn-header-injection.middleware";

@Module({
  imports: [
    EnvironmentConfigModule,
    DistributedCacheModule,
    GithubRepositoryModule
  ],
  controllers: [AssetsCdnProxyController],
  providers: [AssetsCdnProxyService, CdnHeaderInjectionMiddleware]
})
export class AssetsCdnApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CdnHeaderInjectionMiddleware)
      .forRoutes("assets-cdn");
  }
}
