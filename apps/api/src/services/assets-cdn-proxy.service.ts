import { Injectable, Logger, HttpStatus, OnModuleInit } from "@nestjs/common";
import {
  DistributedCacheService,
  EnvironmentConfigService,
  GithubRepositoryConnector,
  getGithubPath,
  getRawUrl,
  resolveParams,
  sanitize,
  networkMap,
  HttpError
} from "@mx-tools/common";
import * as fs from "fs";
import * as path from "path";

interface GithubRepoItem {
  name: string;
  type: string;
  download_url: string;
  path: string;
}

const SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class AssetsCdnProxyService implements OnModuleInit {
  private readonly logger = new Logger(AssetsCdnProxyService.name);
  private isSyncing = false;

  constructor(
    private readonly cacheService: DistributedCacheService,
    private readonly configService: EnvironmentConfigService,
    private readonly githubConnector: GithubRepositoryConnector
  ) {}

  async onModuleInit() {
    this.logger.log("Starting initial cache warm-up...");
    this.syncAll().catch((err) => {
      this.logger.error(`Initial sync failed: ${err.message}`);
    });
    setInterval(() => {
      this.logger.log("Triggering periodic cache synchronization...");
      this.syncAll().catch((err) => {
        this.logger.error(`Periodic sync failed: ${err.message}`);
      });
    }, SYNC_INTERVAL);
  }

  async syncCollection(network: string, type: string): Promise<void> {
    const baseSegment = networkMap[network];
    const path = baseSegment ? `${baseSegment}/${type}` : type;
    const tokenIndicator = this.configService.githubToken ? " (Authenticated)" : " (Unauthenticated)";
    this.logger.log(`[Sync] Starting ${network}/${type}${tokenIndicator}...`);

    try {
      const url = `${this.configService.githubApiBase}/contents/${path}?ref=${this.configService.branch}`;
      const response = await this.githubConnector.githubFetch(url);
      const items = await response.json();

      if (!Array.isArray(items)) {
        this.logger.warn(`[Sync] Expected directory array from GitHub, got ${typeof items}. Skipping ${network}/${type}`);
        return;
      }

      const tasks = items.map((item: GithubRepoItem) => async () => {
        if (type === "accounts" && item.name.endsWith(".json") && item.name !== "icons") {
          const address = item.name.replace(".json", "");
          try {
            const fileContent = await this.githubConnector.fetchWithTimeout(item.download_url).then((r) => r.json());
            const accountData = { address, ...fileContent };
            if (fileContent.icon) {
              const netSegment = network === "mainnet" ? "" : `${network}/`;
              accountData.iconPng = `/assets-cdn/${netSegment}accounts/${address}/icon.png`;
              accountData.iconSvg = `/assets-cdn/${netSegment}accounts/${address}/icon.svg`;
            }
            return accountData;
          } catch (e: unknown) {
            this.logger.error(`[Sync] Failed account ${address}: ${e instanceof Error ? e.message : e}`);
            return null;
          }
        } else if ((type === "tokens" || type === "identities") && item.type === "dir") {
          const infoUrl = `${this.configService.githubRawBase}/${item.path}/info.json`;
          try {
            const infoContent = await this.githubConnector.fetchWithTimeout(infoUrl).then((r) => r.json());
            const key = type === "tokens" ? "identifier" : "identity";
            const itemData = { [key]: item.name, ...infoContent };
            const netSegment = network === "mainnet" ? "" : `${network}/`;
            if (type === "tokens") {
              itemData.pngUrl = `/assets-cdn/${netSegment}tokens/${item.name}/icon.png`;
              itemData.svgUrl = `/assets-cdn/${netSegment}tokens/${item.name}/icon.svg`;
            } else if (type === "identities") {
              itemData.avatar = `/assets-cdn/${netSegment}identities/${item.name}/icon.png`;
            }
            return itemData;
          } catch (e: unknown) {
            this.logger.error(`[Sync] Failed ${type} info for ${item.name}: ${e instanceof Error ? e.message : e}`);
            return null;
          }
        }
        return null;
      });

      const results = await this.githubConnector.limitConcurrency(tasks, 5);
      const filtered = results.filter(Boolean);
      const cacheKey = `assets-cdn:${network}:${type}`;
      await this.cacheService.set(cacheKey, filtered, 900); // 15 min TTL
      this.logger.log(`[Sync] Finished ${network}/${type} (${filtered.length} items cached)`);
    } catch (error: unknown) {
      this.logger.error(`[Sync] Failed ${network}/${type}: ${error instanceof Error ? error.message : error}`);
    }
  }

  async syncAll() {
    if (this.isSyncing) {
      this.logger.warn("Sync is already running. Skipping execution.");
      return;
    }
    this.isSyncing = true;
    this.logger.log("--- Starting Global Background Sync ---");
    const networks = ["mainnet", "testnet", "devnet"];
    const types = ["tokens", "identities", "accounts"];
    const syncTasks: Promise<void>[] = [];
    for (const network of networks) {
      for (const type of types) {
        syncTasks.push(
          this.syncCollection(network, type).catch((err) => {
            this.logger.error(`[Sync] Unhandled error in ${network}/${type}: ${err.message}`);
          })
        );
      }
    }
    try {
      await Promise.all(syncTasks);
      const ready = await this.isReady();
      this.logger.log(`--- Global Background Sync Completed. Cache ready: ${ready} ---`);
    } catch (error: unknown) {
      this.logger.error(`Error during global sync: ${error instanceof Error ? error.message : error}`);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Check if sync is ready. If no data has been synchronised yet, returns false.
   */
  async isReady(): Promise<boolean> {
    const hasData = await this.cacheService.get("assets-cdn:mainnet:tokens");
    return hasData !== null;
  }

  /**
   * Helper to format relative CDN URLs into absolute ones using request host or CDN_BASE_URL.
   */
  resolveUrls<T>(data: T, baseUrl?: string): T {
    const resolvedBase = baseUrl || this.configService.cdnBaseUrl;
    if (!resolvedBase || !data) return data;

    const walk = (val: unknown): unknown => {
      if (!val) return val;
      if (Array.isArray(val)) return val.map(walk);
      if (typeof val === "object") {
        const copy: Record<string, unknown> = { ...(val as Record<string, unknown>) };
        for (const key in copy) {
          if (typeof copy[key] === "string" && (copy[key] as string).startsWith("/assets-cdn/")) {
            copy[key] = `${resolvedBase}${copy[key]}`;
          } else if (typeof copy[key] === "object" && copy[key] !== null) {
            copy[key] = walk(copy[key]);
          }
        }
        return copy;
      }
      return val;
    };

    return walk(data) as T;
  }

  /**
   * Fetch a full collection from Cache
   */
  async getCollection(p1: string, p2?: string, baseUrl?: string): Promise<Record<string, unknown>[] | null> {
    const { network, type } = resolveParams({ p1, p2 });
    const cacheKey = `assets-cdn:${network}:${type}`;
    const items = await this.cacheService.get<Record<string, unknown>[]>(cacheKey);
    return items ? this.resolveUrls(items, baseUrl) : null;
  }

  /**
   * Fetch a single item by key (fallback to Github if cache miss)
   */
  async getItem(p1: string, p2: string, p3?: string, p4?: string, baseUrl?: string): Promise<unknown> {
    const { network, type } = resolveParams({ p1, p2, p3 });
    let { id } = resolveParams({ p1, p2, p3 });
    if (p4) id = p3 || "";

    // 1. Try Cache first
    const cacheKey = `assets-cdn:${network}:${type}`;
    const items = await this.cacheService.get<Record<string, unknown>[]>(cacheKey);
    if (items) {
      const matchKey = type === "accounts" ? "address" : (type === "tokens" ? "identifier" : "identity");
      const matched = items.find((item: Record<string, unknown>) => item[matchKey] === id);
      if (matched) {
        return this.resolveUrls(matched, baseUrl);
      }
    }

    // 2. Cache Miss: Fetch directly from Github Raw
    const path = getGithubPath(network, type, id);
    this.logger.log(`Cache miss. Fetching fallback item directly from GitHub: ${path}`);

    try {
      const url = `${this.configService.githubRawBase}/${path}`;
      const response = await this.githubConnector.fetchWithTimeout(url);
      if (!response.ok) {
        if (response.status === 404) {
          throw new HttpError(HttpStatus.NOT_FOUND, "Not found");
        }
        throw new HttpError(response.status, `GitHub fetch failed: ${response.status}`);
      }

      const content = await response.json();
      const matchKey = type === "accounts" ? "address" : (type === "tokens" ? "identifier" : "identity");
      const result: Record<string, unknown> = { [matchKey]: id, ...content };

      const netSegment = network === "mainnet" ? "" : `${network}/`;
      if (type === "tokens") {
        result.pngUrl = `/assets-cdn/${netSegment}tokens/${id}/icon.png`;
        result.svgUrl = `/assets-cdn/${netSegment}tokens/${id}/icon.svg`;
      } else if (type === "identities") {
        result.avatar = `/assets-cdn/${netSegment}identities/${id}/icon.png`;
      } else if (type === "accounts" && content.icon) {
        result.iconPng = `/assets-cdn/${netSegment}accounts/${id}/icon.png`;
        result.iconSvg = `/assets-cdn/${netSegment}accounts/${id}/icon.svg`;
      }

      return this.resolveUrls(result, baseUrl);
    } catch (error: unknown) {
      if (error instanceof HttpError) {
        throw error;
      }
      this.logger.error(`Error in fallback fetch for ${path}: ${error instanceof Error ? error.message : error}`);
      throw new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error");
    }
  }

  /**
   * Fetch asset icon/logo binary
   */
  async getIcon(p1: string, p2: string, p3?: string, p4?: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const { p1: cleanP1, p2: cleanP2, p3: cleanP3, p4: cleanP4 } = {
      p1: sanitize(p1),
      p2: sanitize(p2),
      p3: sanitize(p3),
      p4: sanitize(p4)
    };

    const { network, type } = resolveParams({ p1: cleanP1, p2: cleanP2, p3: cleanP3 });
    let { id } = resolveParams({ p1: cleanP1, p2: cleanP2, p3: cleanP3 });
    const fileName = cleanP4 || cleanP3 || "";
    const parts = fileName.split(".");
    const ext = parts.length > 1 ? parts[parts.length - 1] : "";

    if (ext !== "svg" && ext !== "png") {
      throw new HttpError(HttpStatus.BAD_REQUEST, "Invalid icon extension");
    }

    if (!cleanP4) {
      id = cleanP2;
    }

    this.logger.log(`Fetching icon binary: ${network}/${type}/${id} (${ext})`);

    try {
      let rawUrl = "";
      if (type === "accounts") {
        const accountPath = getGithubPath(network, type, id);
        const accountUrl = `${this.configService.githubRawBase}/${accountPath}`;
        const accountResponse = await this.githubConnector.fetchWithTimeout(accountUrl);
        if (!accountResponse.ok) {
          throw new HttpError(HttpStatus.NOT_FOUND, "Account info not found");
        }
        const accountData = await accountResponse.json();
        const iconName = sanitize(accountData.icon || id);
        rawUrl = getRawUrl(network, type, id, `icons/${iconName}.${ext}`, this.configService.githubRawBase);
      } else {
        rawUrl = getRawUrl(network, type, id, `logo.${ext}`, this.configService.githubRawBase);
      }

      const response = await this.githubConnector.fetchWithTimeout(rawUrl);
      if (!response.ok) {
        throw new HttpError(HttpStatus.NOT_FOUND, "Icon file not found");
      }

      const arrayBuffer = await response.arrayBuffer();
      return {
        buffer: Buffer.from(arrayBuffer),
        mimeType: ext === "svg" ? "image/svg+xml" : "image/png"
      };
    } catch (error: unknown) {
      if (error instanceof HttpError && error.status === HttpStatus.NOT_FOUND) {
        try {
          const localPath = path.join(process.cwd(), "apps", "api", "src", "assets", "default-images", `default.${ext}`);
          if (fs.existsSync(localPath)) {
            this.logger.log(`Serving local universal fallback: default.${ext}`);
            const buffer = fs.readFileSync(localPath);
            return {
              buffer,
              mimeType: ext === "svg" ? "image/svg+xml" : "image/png"
            };
          } else if (ext === "png") {
            this.logger.log(`Serving dynamic 1x1 transparent PNG fallback`);
            const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
            return {
              buffer: transparentPng,
              mimeType: "image/png"
            };
          }
        } catch (fsErr) {
          this.logger.error(`Error loading fallback local icon: ${fsErr instanceof Error ? fsErr.message : fsErr}`);
        }
      }
      if (error instanceof HttpError) {
        throw error;
      }
      this.logger.error(`Error fetching icon ${network}/${type}/${id}: ${error instanceof Error ? error.message : error}`);
      throw new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error");
    }
  }
}
