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
]

const STATIC_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Referrer-Policy": "no-referrer-when-downgrade",
  "Cross-Origin-Embedder-Policy": "unsafe-none",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://raw.githubusercontent.com https://petstore.swagger.io https://validator.swagger.io; connect-src 'self' https://*.trycloudflare.com wss://*.trycloudflare.com:*;",
}

function resolveOrigin(req) {
  const allowed = (process.env.ALLOWED_ORIGIN || "").split(",")
  const origin = req.headers.origin
  if (process.env.ALLOWED_ORIGIN === "*") return "*"
  return allowed.includes(origin) ? origin : allowed[0] || "http://localhost:3200"
}

function isAssetPath(req) {
  const path = req.path || (req.url ? req.url.split("?")[0] : "")
  return path.startsWith("/assets-cdn")
}

function originHeader(req, res, next) {
  if (!isAssetPath(req)) res.setHeader("Access-Control-Allow-Origin", resolveOrigin(req))
  next()
}

function staticHeaders(req, res, next) {
  if (!isAssetPath(req)) {
    for (const [name, value] of Object.entries(STATIC_HEADERS)) res.setHeader(name, value)
  }
  next()
}

function varyHeader(req, res, next) {
  if (!isAssetPath(req) && process.env.ALLOWED_ORIGIN !== "*") res.setHeader("Vary", "Origin")
  next()
}

const securityHeaders = [originHeader, staticHeaders, varyHeader]

function createSecurityHeaders() {
  return function middleware(req, res, next) {
    let index = 0
    function run(err) {
      if (err) return next(err)
      if (index >= securityHeaders.length) return next()
      securityHeaders[index++](req, res, run)
    }
    run()
  }
}

function applySecurityHeaders(req, res) {
  if (res.headersSent || isAssetPath(req)) return
  res.setHeader("Access-Control-Allow-Origin", resolveOrigin(req))
  for (const [name, value] of Object.entries(STATIC_HEADERS)) res.setHeader(name, value)
  if (process.env.ALLOWED_ORIGIN !== "*") res.setHeader("Vary", "Origin")
}

export default { ALLOWED_CDN_HEADERS, applySecurityHeaders, createSecurityHeaders }
