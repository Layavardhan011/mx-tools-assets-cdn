import { Injectable, Logger } from "@nestjs/common";
import { EnvironmentConfigService } from "../config/environment-config.service";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

@Injectable()
export class GithubRepositoryConnector {
  private readonly logger = new Logger(GithubRepositoryConnector.name);
  private readonly fetchTimeoutMs = 10000;

  constructor(private readonly configService: EnvironmentConfigService) {}

  async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = this.fetchTimeoutMs): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(id);
    }
  }

  async githubFetch(url: string): Promise<Response> {
    this.logger.log(`Initiating GitHub API fetch request for URL: ${url}`);
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "MultiversX-Assets-CDN-Enterprise-Proxy"
    };

    const token = this.configService.githubToken;
    if (token) {
      headers["Authorization"] = `token ${token}`;
    }

    const response = await this.fetchWithTimeout(url, { headers });
    if (!response.ok) {
      throw new HttpError(response.status, `GitHub API error: ${response.status}`);
    }
    return response;
  }

  async limitConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
    const results: Promise<T>[] = [];
    const executing: Promise<unknown>[] = [];
    for (const task of tasks) {
      const p = Promise.resolve().then(() => task());
      results.push(p);
      if (limit <= tasks.length) {
        const e: Promise<unknown> = p.then(() => executing.splice(executing.indexOf(e), 1));
        executing.push(e);
        if (executing.length >= limit) {
          await Promise.race(executing);
        }
      }
    }
    return Promise.all(results);
  }
}
