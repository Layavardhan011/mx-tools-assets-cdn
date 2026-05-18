/**
 * @prettier
 */

const path = require("path")
const http = require("http")
require("dotenv").config({ path: path.join(__dirname, "../.env") })
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const {
  HtmlWebpackSkipAssetsPlugin,
} = require("html-webpack-skip-assets-plugin")

const configBuilder = require("./_config-builder")
const styleConfig = require("./stylesheets")

const projectBasePath = path.join(__dirname, "../")
const isDevelopment = process.env.NODE_ENV !== "production"

const devConfig = configBuilder(
  {
    minimize: false,
    mangle: false,
    sourcemaps: true,
    includeDependencies: true,
  },
  {
    mode: "development",
    entry: {
      "swagger-ui-bundle": ["./src/core/index.js"],
      "swagger-ui-standalone-preset": [
        "./src/standalone/presets/standalone/index.js",
      ],
      "swagger-ui": "./src/style/main.scss",
      vendors: ["react-refresh/runtime"],
    },

    performance: {
      hints: false,
    },

    output: {
      filename: "[name].js",
      chunkFilename: "[id].js",
      library: {
        name: "[name]",
        export: "default",
      },
      publicPath: "/",
    },

    devServer: {
      // ===============================================================================
      // ISSUE 3: ALLOWED HOSTS - Security fix to restrict which hosts can access the server
      // ===============================================================================
      // For development: defaults to localhost only
      // For production: Set ALLOWED_HOSTS env variable with comma-separated domains
      //
      // Examples:
      //   - Single domain: ALLOWED_HOSTS=tools.multiversx-assets-cdn.com
      //   - Multiple domains: ALLOWED_HOSTS=tools.multiversx.com,dapp.multiversx.com,localhost
      //   - Local dev: ALLOWED_HOSTS=localhost,127.0.0.1
      //
      // IMPORTANT: In production, avoid using "all" as it allows any IP to access your server
      // ===============================================================================
      allowedHosts: process.env.ALLOWED_HOSTS
        ? process.env.ALLOWED_HOSTS.split(",")
        : ["localhost", "127.0.0.1", ".trycloudflare.com"], // Allow Cloudflare tunnels

      // ===============================================================================
      // ISSUE 2: CORS CONFIGURATION - Security fix to restrict cross-origin requests
      // ===============================================================================
      // For development: defaults to allowing localhost
      // For production: Set ALLOWED_ORIGIN env variable with comma-separated origins
      //
      // Examples:
      //   - Single domain: ALLOWED_ORIGIN=https://tools.multiversx.com
      //   - Multiple domains: ALLOWED_ORIGIN=https://dapp.multiversx.com,https://tools.multiversx.com
      //   - Allow all (NOT recommended for production): ALLOWED_ORIGIN=*
      //
      // IMPORTANT: The * (wildcard) allows any website to make requests to your API
      // Only use * if your API is completely public and has no sensitive data
      // ===============================================================================
      setupMiddlewares: (middlewares, devServer) => {
        if (!devServer) {
          throw new Error("webpack-dev-server is not defined")
        }

        // 1. Hide X-Powered-By to prevent information leakage
        if (devServer.app && devServer.app.disable) {
          devServer.app.disable("x-powered-by")
        }

        // Security Header Helper: Ensures headers are set even on errors/blocks
        const applySecurityHeaders = (req, res) => {
          if (res.headersSent) return
          const allowed = (process.env.ALLOWED_ORIGIN || "").split(",")
          const origin = req.headers.origin
          const allowAll = process.env.ALLOWED_ORIGIN === "*"
          const allowOrigin = allowAll
            ? "*"
            : (allowed.includes(origin) ? origin : allowed[0] || "http://localhost:3200")

          res.setHeader("Access-Control-Allow-Origin", allowOrigin)
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
          res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
          if (!allowAll) {
            // When echoing Origin (or choosing from an allowlist), ensure caches do not mix responses across origins.
            res.setHeader("Vary", "Origin")
          }
          res.setHeader("X-Content-Type-Options", "nosniff")
          res.setHeader("X-Frame-Options", "DENY")
          res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
          res.setHeader("Referrer-Policy", "no-referrer-when-downgrade")
          res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()")
          res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none")
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin")
          res.setHeader("Cross-Origin-Resource-Policy", "cross-origin")
          res.setHeader("X-Permitted-Cross-Domain-Policies", "none")
          res.setHeader(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://raw.githubusercontent.com; connect-src 'self' https://*.trycloudflare.com;"
          )
        }

        // 2. Simple In-Memory Rate Limiter
        const rateLimit = new Map()
        const LIMIT_PER_MINUTE = 500 // Increased limit to allow full security scans
        const WINDOW_MS = 60000

        // 3. Assets CDN direct proxy bypass to prevent serve-static/send race conditions and "Can't set headers after they are sent" crashes.
        middlewares.unshift({
          name: "assets-cdn-proxy-bypass",
          path: "/assets-cdn",
          middleware: (req, res) => {
            const targetHost = "127.0.0.1"
            const targetPort = 3201

            const proxyReq = http.request(
              {
                host: targetHost,
                port: targetPort,
                path: req.originalUrl || req.url,
                method: req.method,
                headers: req.headers,
              },
              (proxyRes) => {
                if (!res.headersSent) {
                  res.writeHead(proxyRes.statusCode, proxyRes.headers)
                }
                proxyRes.pipe(res)
              }
            )

            proxyReq.on("error", (err) => {
              console.error("[Proxy Bypass Error]:", err.message)
              if (!res.headersSent) {
                res.status(502).send("Bad Gateway - Assets Proxy is offline or synchronizing")
              }
            })

            req.pipe(proxyReq)
          }
        })

        // 4. Consolidated Security Shield (Firewall + Rate Limit + Headers)
        middlewares.unshift({
          name: "security-shield",
          path: "*",
          middleware: (req, res, next) => {
            // Apply headers immediately to every request
            applySecurityHeaders(req, res)

            const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown"
            const now = Date.now()

            // Rate Limit Logic
            const userData = rateLimit.get(ip) || { count: 0, start: now }
            if (now - userData.start > WINDOW_MS) {
              userData.count = 1
              userData.start = now
            } else {
              userData.count++
            }
            rateLimit.set(ip, userData)

            if (userData.count > LIMIT_PER_MINUTE) {
              return res.status(429).send("Too Many Requests - Security Limit Triggered")
            }

            // Firewall Logic: Block malicious bot requests (Encoded and Raw)
            const fullPath = decodeURIComponent(req.originalUrl || req.url || "")
            if (
              fullPath.includes("${") ||
              fullPath.includes("..") ||
              fullPath.includes("<script") ||
              fullPath.includes("\0") ||
              fullPath.includes("\\")
            ) {
              return res.status(403).send("Forbidden - Malicious Request Blocked")
            }

            // Handle Preflight OPTIONS requests
            if (req.method === "OPTIONS") {
              return res.status(204).end()
            }

            next()
          },
        })

        return middlewares
      },
      port: 3200,
      host: "0.0.0.0",
      hot: true,
      static: {
        directory: path.resolve(projectBasePath, "dev-helpers"),
        publicPath: "/",
        serveIndex: false,
      },
      client: {
        logging: "info",
        progress: true,
      },
      proxy: [
        {
          context: ["/assets-cdn"],
          target: "http://localhost:3201",
        },
      ],
    },

    module: {
      rules: [
        {
          test: /\.jsx?$/,
          include: [
            path.join(projectBasePath, "src"),
            path.join(projectBasePath, "node_modules", "object-assign-deep"),
          ],
          loader: "babel-loader",
          options: {
            retainLines: true,
            cacheDirectory: true,
            plugins: [
              isDevelopment && require.resolve("react-refresh/babel"),
            ].filter(Boolean),
          },
        },
        {
          test: /\.(txt|yaml)$/,
          type: "asset/source",
        },
        {
          test: /\.svg$/,
          use: ["@svgr/webpack"],
        },
        {
          test: /\.(png|jpg|jpeg|gif)$/,
          type: "asset/inline",
        },
      ],
    },

    plugins: [
      isDevelopment && new ReactRefreshWebpackPlugin({ library: "[name]" }),
      new HtmlWebpackPlugin({
        template: path.join(projectBasePath, "dev-helpers", "index.html"),
      }),
      new HtmlWebpackSkipAssetsPlugin({
        skipAssets: [/swagger-ui\.js/],
      }),
    ].filter(Boolean),

    optimization: {
      runtimeChunk: "single", // for multiple entry points using ReactRefreshWebpackPlugin
    },
  }
)

// mix in the style config's plugins and loader rules

devConfig.plugins = [...devConfig.plugins, ...styleConfig.plugins]

devConfig.module.rules = [
  ...devConfig.module.rules,
  ...styleConfig.module.rules,
]

module.exports = devConfig
