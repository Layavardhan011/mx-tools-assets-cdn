import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class EnvironmentConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return this.configService.get<number>("PORT", 3201);
  }

  get githubToken(): string | undefined {
    return this.configService.get<string>("GITHUB_TOKEN");
  }

  get repoOwner(): string {
    return this.configService.get<string>("REPO_OWNER", "Layavardhan011");
  }

  get repoName(): string {
    return this.configService.get<string>("REPO_NAME", "demo-assets");
  }

  get branch(): string {
    return this.configService.get<string>("BRANCH", "main");
  }

  get redisUrl(): string | undefined {
    return this.configService.get<string>("REDIS_URL");
  }

  get redisPassword(): string | undefined {
    return this.configService.get<string>("REDIS_PASSWORD");
  }

  get allowedOrigin(): string[] {
    const raw = this.configService.get<string>("ALLOWED_ORIGIN", "");
    return raw ? raw.split(",") : [];
  }

  get cdnBaseUrl(): string {
    return this.configService.get<string>("CDN_BASE_URL", "");
  }

  private sanitizeRepoComponent(value: string): string {
    if (!/^[a-zA-Z0-9._\-/]+$/.test(value)) {
      throw new Error(`Invalid repo component: ${value}`);
    }
    return value;
  }

  get githubApiBase(): string {
    return `https://api.github.com/repos/${this.sanitizeRepoComponent(this.repoOwner)}/${this.sanitizeRepoComponent(this.repoName)}`;
  }

  get githubRawBase(): string {
    return `https://raw.githubusercontent.com/${this.sanitizeRepoComponent(this.repoOwner)}/${this.sanitizeRepoComponent(this.repoName)}/${this.sanitizeRepoComponent(this.branch)}`;
  }

  get cdnCorsOrigin(): string {
    return this.configService.get<string>("CDN_CORS_ORIGIN", "*");
  }

  get cdnXPoweredBy(): string {
    return this.configService.get<string>("CDN_X_POWERED_BY", "Express");
  }

  get cdnSts(): string {
    return this.configService.get<string>("CDN_STS", "max-age=31536000; includeSubDomains");
  }

  get cdnServer(): string {
    return this.configService.get<string>("CDN_SERVER", "cloudflare");
  }

  get cdnCfRaySuffix(): string | undefined {
    return this.configService.get<string>("CDN_CF_RAY_SUFFIX");
  }

  get cdnCluster(): string | undefined {
    return this.configService.get<string>("CDN_CLUSTER");
  }

  get cdnCacheControl(): string {
    return this.configService.get<string>("CDN_CACHE_CONTROL", "public, max-age=3600");
  }

  get cdnCfCacheStatus(): string {
    return this.configService.get<string>("CDN_CF_CACHE_STATUS", "DYNAMIC");
  }
}
