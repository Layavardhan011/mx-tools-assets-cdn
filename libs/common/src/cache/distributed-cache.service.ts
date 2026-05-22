import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from "@nestjs/common";
import { createClient, RedisClientType } from "redis";
import { EnvironmentConfigService } from "../config/environment-config.service";

@Injectable()
export class DistributedCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DistributedCacheService.name);
  private redisClient: RedisClientType | null = null;
  private readonly inMemoryStore: Map<string, unknown> = new Map();
  private redisConnected = false;

  constructor(private readonly configService: EnvironmentConfigService) {}

  async onModuleInit() {
    const url = this.configService.redisUrl;
    if (url) {
      this.logger.log(`Attempting connection to Redis at ${url}...`);
      const options: Record<string, unknown> = {
        url,
        socket: {
          reconnectStrategy: (retries: number) => {
            if (retries > 2) {
              this.logger.error("Redis reconnection attempts exceeded. Aborting reconnection, continuing on In-Memory fallback.");
              return false; // stop reconnecting
            }
            return Math.min(retries * 500, 1000);
          }
        }
      };
      if (this.configService.redisPassword) {
        options.password = this.configService.redisPassword;
      }
      try {
        const client = createClient(options) as RedisClientType;
        client.on("error", (err) => {
          this.logger.error(`Redis Error: ${err.message}`);
          this.redisConnected = false;
        });
        client.on("connect", () => {
          this.logger.log("Redis client connected successfully.");
          this.redisConnected = true;
        });
        await client.connect();
        this.redisClient = client;
      } catch (error: unknown) {
        this.logger.error(`Failed to initialize Redis. Falling back to In-Memory cache: ${error instanceof Error ? error.message : error}`);
      }
    } else {
      this.logger.log("No REDIS_URL configured. Operating purely in In-Memory fallback mode.");
    }
  }

  async onModuleDestroy() {
    this.inMemoryStore.clear();
    if (this.redisClient && this.redisConnected) {
      try {
        const keys = await this.redisClient.keys("assets-cdn:*");
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          this.logger.log(`Cleared ${keys.length} cached keys from Redis on shutdown.`);
        }
      } catch (err: unknown) {
        this.logger.error(`Error clearing Redis cache on shutdown: ${err instanceof Error ? err.message : err}`);
      }
      await this.redisClient.disconnect();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redisConnected && this.redisClient) {
      try {
        const value = await this.redisClient.get(key);
        return value ? (JSON.parse(value) as T) : null;
      } catch (err: unknown) {
        this.logger.error(`Error reading key ${key} from Redis: ${err instanceof Error ? err.message : err}`);
      }
    }
    return (this.inMemoryStore.get(key) as T) || null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (this.redisConnected && this.redisClient) {
      try {
        const stringified = JSON.stringify(value);
        if (ttlSeconds) {
          await this.redisClient.setEx(key, ttlSeconds, stringified);
        } else {
          await this.redisClient.set(key, stringified);
        }
        return;
      } catch (err: unknown) {
        this.logger.error(`Error writing key ${key} to Redis: ${err instanceof Error ? err.message : err}`);
      }
    }
    this.inMemoryStore.set(key, value);
  }

  isReady(): boolean {
    return true; // The cache is always functional since we have memory fallback
  }

  isRedisConnected(): boolean {
    return this.redisConnected;
  }

  getClient(): RedisClientType | null {
    return this.redisClient;
  }
}
