import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { EnvironmentConfigService } from "@mx-tools/common";
import { randomUUID } from "crypto";

const ALLOWED_CDN_HEADERS = [
  "access-control-allow-origin",
  "cf-cache-status",
  "cf-ray",
  "cluster",
  "content-encoding",
  "content-type",
  "date",
  "etag",
  "server",
  "strict-transport-security",
  "x-powered-by",
  "x-content-type-options",
  "x-frame-options",
  "x-xss-protection",
  "referrer-policy",
  "cross-origin-embedder-policy",
  "cross-origin-opener-policy",
  "content-security-policy",
  "permissions-policy"
];

@Injectable()
export class CdnHeaderInjectionMiddleware implements NestMiddleware {
  constructor(private readonly configService: EnvironmentConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Prevent adding response headers that we don't want to expose (e.g. Swagger "Response headers")
    const originalSetHeader = res.setHeader.bind(res);
    res.setHeader = ((name: string, value: string | number | readonly string[]) => {
      const key = String(name).toLowerCase();
      if (key === "cache-control" || key === "vary") {
        return res;
      }
      return originalSetHeader(name, value);
    }) as typeof res.setHeader;

    // 1. Inject Static CDN Headers
    res.setHeader("access-control-allow-origin", this.configService.cdnCorsOrigin);
    res.setHeader("x-powered-by", this.configService.cdnXPoweredBy);
    res.setHeader("strict-transport-security", this.configService.cdnSts);
    res.setHeader("server", this.configService.cdnServer);

    // 2. Resolve Datacenter
    const datacenters = ["AMS", "CDG", "HYD", "OTP", "LHR", "FRA", "SJC", "IAD"];
    let datacenter = this.configService.cdnCfRaySuffix;

    if (!datacenter) {
      const incomingCfRay = req.headers["cf-ray"];
      if (incomingCfRay && typeof incomingCfRay === "string") {
        const parts = incomingCfRay.split("-");
        const suffix = parts[parts.length - 1];
        if (suffix && suffix.length === 3) {
          datacenter = suffix.toUpperCase();
        }
      }
    }

    if (!datacenter) {
      const incomingCountry = req.headers["cf-ipcountry"];
      if (incomingCountry && typeof incomingCountry === "string") {
        const countryToDc: Record<string, string> = {
          IN: "HYD",
          RO: "OTP",
          FR: "CDG",
          NL: "AMS",
          GB: "LHR",
          DE: "FRA",
          US: "IAD",
          JP: "NRT"
        };
        const mapped = countryToDc[incomingCountry.toUpperCase()];
        if (mapped) datacenter = mapped;
      }
    }

    if (!datacenter) {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        const tzToDc: Record<string, string> = {
          "Asia/Kolkata": "HYD",
          "Asia/Calcutta": "HYD",
          "Europe/Bucharest": "OTP",
          "Europe/Paris": "CDG",
          "Europe/Amsterdam": "AMS",
          "Europe/London": "LHR",
          "Europe/Berlin": "FRA",
          "Europe/Frankfurt": "FRA",
          "America/New_York": "IAD",
          "America/Detroit": "IAD",
          "America/Los_Angeles": "SJC",
          "America/Denver": "DEN",
          "America/Chicago": "ORD",
          "Asia/Tokyo": "NRT"
        };
        const mapped = tzToDc[tz];
        if (mapped) datacenter = mapped;
      } catch {
        /* ignore */
      }
    }

    if (!datacenter || !datacenters.includes(datacenter)) {
      datacenter = "AMS";
    }

    // 3. Resolve Cluster
    const datacenterToCluster: Record<string, string> = {
      AMS: "mainnet-ams",
      CDG: "mainnet-cdg",
      OTP: "mainnet-ovh",
      HYD: "mainnet-hyd"
    };
    const dynamicCluster = this.configService.cdnCluster || datacenterToCluster[datacenter] || "mainnet-ovh";

    res.setHeader("cluster", dynamicCluster);

    // Pass through real Cloudflare cf-ray if present, otherwise generate a unique one
    const incomingCfRay = req.headers["cf-ray"];
    if (incomingCfRay && typeof incomingCfRay === "string") {
      res.setHeader("cf-ray", incomingCfRay);
    } else {
      res.setHeader("cf-ray", `${randomUUID().replace(/-/g, "").substring(0, 16)}-${datacenter}`);
    }

    if (!res.getHeader("cf-cache-status")) {
      res.setHeader("cf-cache-status", this.configService.cdnCfCacheStatus);
    }

    // 4. Wrap WriteHead to Filter Allowed CDN Headers
    const originalWriteHead = res.writeHead;
    res.writeHead = function (this: Response, ...args: unknown[]) {
      const currentHeaders = res.getHeaders ? res.getHeaders() : {};
      Object.keys(currentHeaders).forEach((name) => {
        if (!ALLOWED_CDN_HEADERS.includes(name.toLowerCase())) {
          res.removeHeader(name);
        }
      });

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg && typeof arg === "object" && !Array.isArray(arg)) {
          const headersObj = arg as Record<string, unknown>;
          Object.keys(headersObj).forEach((key) => {
            if (!ALLOWED_CDN_HEADERS.includes(key.toLowerCase())) {
              delete headersObj[key];
            }
          });
        }
      }
      return originalWriteHead.apply(this, args as Parameters<typeof originalWriteHead>);
    } as typeof originalWriteHead;

    next();
  }
}
