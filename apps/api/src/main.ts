import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AssetsCdnApiModule } from "./assets-cdn-api.module";
import { EnvironmentConfigService, DistributedCacheService } from "@mx-tools/common";
import { Logger, ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import compression from "compression";
import helmet from "helmet";
import rateLimit, { Store } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { Request, Response, NextFunction } from "express";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AssetsCdnApiModule);

  const configService = app.get(EnvironmentConfigService);
  const cacheService = app.get(DistributedCacheService);

  const expressApp = app.getHttpAdapter().getInstance();

  // 0. Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // 1. Trust Proxy
  expressApp.set("trust proxy", 1);
  expressApp.disable("x-powered-by");

  // 2. Swagger Init Cache Control Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.includes("swagger-ui-init.js") || req.path.includes("dev-helper-initializer.js")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    next();
  });

  // 3. Compression — P8: Skip PNG (already compressed); compress JSON, SVG, etc.
  app.use(compression({
    filter: (req: Request, res: Response) => {
      if (req.path.endsWith('.png')) return false;
      return compression.filter(req, res);
    }
  }));

  // 4. Response Size Limit (10MB) — P4: Stringify once to avoid double serialization
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS") return next();
    const _originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      const serialized = JSON.stringify(body);
      const size = Buffer.byteLength(serialized, "utf8");
      if (size > 10 * 1024 * 1024) {
        return res.status(413).send("Response too large");
      }
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.send(serialized);
    } as typeof _originalJson;
    next();
  });

  // 5. Helmet Security (Skip CSP specifically on /assets-cdn documentation page to allow native Swagger-UI inline scripts & assets)
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/assets-cdn' || req.path === '/assets-cdn/') {
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
          }
        },
        crossOriginResourcePolicy: { policy: "cross-origin" },
        frameguard: { action: "deny" },
        hsts: { maxAge: 31536000, includeSubDomains: true }
      })(req, res, next);
    } else {
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https://raw.githubusercontent.com"],
            scriptSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
          }
        },
        crossOriginResourcePolicy: { policy: "cross-origin" },
        frameguard: { action: "deny" },
        hsts: { maxAge: 31536000, includeSubDomains: true }
      })(req, res, next);
    }
  });

  // 6. Rate Limiter (with optional Redis store integration)
  let rateLimitStore: Store | undefined = undefined;
  if (cacheService.isRedisConnected()) {
    const redisClient = cacheService.getClient();
    if (redisClient) {
      rateLimitStore = new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args)
      });
      logger.log("Using Redis-backed store for rate limiting.");
    }
  } else {
    logger.log("Using In-Memory store for rate limiting.");
  }

  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // max requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    store: rateLimitStore
  });
  app.use(limiter);

  // 7. CORS Options matching original Express settings
  const allowedOrigin = configService.allowedOrigin;
  app.enableCors({
    origin: (origin: string, callback: (err: Error | null, allow: boolean) => void) => {
      if (allowedOrigin.includes("*")) {
        return callback(null, true);
      }
      if (!origin) {
        if (process.env.NODE_ENV === "production") {
          return callback(null, false);
        }
        return callback(null, true);
      }
      if (allowedOrigin.length === 0) {
        return callback(null, false);
      }
      if (allowedOrigin.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  });

  const port = configService.port;

  // 8. Swagger Documentation Setup (generated from controller decorators)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MultiversX Assets CDN')
    .setDescription(
      'Welcome to the MultiversX Microservice API!\n\n' +
      'Here you can set your custom documentation in markdown format\n\n' +
      '[MultiversX Docs](https://docs.multiversx.com)'
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Clean up tags to remove the default controller tag "AssetsCdnProxy"
  if (document && document.paths) {
    for (const pathKey of Object.keys(document.paths)) {
      const pathItem = document.paths[pathKey];
      if (pathItem) {
        for (const methodKey of Object.keys(pathItem)) {
          const operation = (pathItem as Record<string, unknown>)[methodKey];
          if (operation && typeof operation === "object" && "tags" in operation) {
            const opWithTags = operation as { tags: unknown };
            if (Array.isArray(opWithTags.tags)) {
              opWithTags.tags = opWithTags.tags.filter((tag: unknown) => typeof tag === "string" && tag !== "AssetsCdnProxy");
            }
          }
        }
      }
    }
  }

  SwaggerModule.setup('assets-cdn', app, document, {
    customCss: `
      /* Hide "Description" column only in the static "Responses" list (keep it in Parameters & live "Server response") */
      .swagger-ui .responses-table:not(.live-responses-table) .response-col_description,
      .swagger-ui .responses-table:not(.live-responses-table) th.response-col_description,
      .swagger-ui .responses-table:not(.live-responses-table) td.response-col_description {
        display: none !important;
      }

      /* Position the dark mode bulb icon toggle in the header to the far right */
      .swagger-ui .topbar .topbar-wrapper {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        width: 100% !important;
      }
      .swagger-ui .topbar .topbar-wrapper .dark-mode-toggle {
        margin-left: auto !important;
      }
    `
  });

  await app.listen(port);
  logger.log(`Assets CDN API REST Gateway is actively listening on port ${port}`);
}

bootstrap();
