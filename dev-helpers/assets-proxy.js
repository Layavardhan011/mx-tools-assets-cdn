/* eslint-disable no-console */
const express = require("express")
const cors = require("cors")
const fs = require("fs")
const path = require("path")
const compression = require("compression")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const RedisStore = require("rate-limit-redis").default
const { createClient } = require("redis")

// Simple .env loader
try {
  const envPath = path.join(__dirname, "../.env")
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8")
    envContent.split("\n").forEach(line => {
      const [key, ...value] = line.split("=")
      if (key && value) {
        process.env[key.trim()] = value.join("=").trim()
      }
    })
  }
} catch (e) {
  console.warn("Could not load .env file")
}

const app = express()
app.set("trust proxy", 1)
app.disable("x-powered-by")
app.use(compression())

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://raw.githubusercontent.com"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))
const port = process.env.PORT || 3201

// Redis client for rate limiting
let redisClient
let redisStore

if (process.env.REDIS_URL) {
  const redisOptions = { url: process.env.REDIS_URL }
  if (process.env.REDIS_PASSWORD) {
    redisOptions.password = process.env.REDIS_PASSWORD
  }
  
  redisClient = createClient(redisOptions)
  redisClient.connect().catch(console.error)
  redisStore = new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  })
}

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // max requests per window
  standardHeaders: false,
  legacyHeaders: false,
  store: redisStore,
})

// Apply rate limiting
app.use(limiter)

const REPO_OWNER = process.env.REPO_OWNER || "Layavardhan011"
const REPO_NAME = process.env.REPO_NAME || "demo-assets"
const BRANCH = process.env.BRANCH || "main"
const GITHUB_API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}`

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(",") : []

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGIN.includes("*")) {
      return callback(null, true)
    }
    if (ALLOWED_ORIGIN.length === 0) {
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true)
      }
      // In production, if no allowlist is configured, do not emit CORS headers.
      return callback(null, false)
    }
    if (ALLOWED_ORIGIN.includes(origin) || (origin && origin.endsWith(".trycloudflare.com"))) {
      callback(null, true)
    } else {
      // For unauthorized origins, do not emit CORS headers (do not hard-fail the request).
      callback(null, false)
    }
  },
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}
app.use(cors(corsOptions))

const networkMap = {
  devnet: "devnet",
  testnet: "testnet",
  mainnet: ""
}

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

// Align all response headers with production CDN
app.use("/assets-cdn", (req, res, next) => {
  const CDN_HEADERS = {
    static: {
      "access-control-allow-origin": process.env.CDN_CORS_ORIGIN || "*",
      "x-powered-by": process.env.CDN_X_POWERED_BY || "Express",
      "strict-transport-security": process.env.CDN_STS || "max-age=31536000; includeSubDomains",
      "server": process.env.CDN_SERVER || "cloudflare",
    }
  }

  Object.entries(CDN_HEADERS.static).forEach(([name, val]) => {
    res.setHeader(name, val)
  })

  const datacenters = ["AMS", "CDG", "HYD", "OTP", "LHR", "FRA", "SJC", "IAD"]
  let datacenter = process.env.CDN_CF_RAY_SUFFIX

  if (!datacenter) {
    const incomingCfRay = req.headers["cf-ray"]
    if (incomingCfRay && typeof incomingCfRay === "string") {
      const parts = incomingCfRay.split("-")
      const suffix = parts[parts.length - 1]
      if (suffix && suffix.length === 3) datacenter = suffix.toUpperCase()
    }
  }

  if (!datacenter) {
    const incomingCountry = req.headers["cf-ipcountry"]
    if (incomingCountry && typeof incomingCountry === "string") {
      const countryToDc = {
        "IN": "HYD", "RO": "OTP", "FR": "CDG", "NL": "AMS",
        "GB": "LHR", "DE": "FRA", "US": "IAD", "JP": "NRT"
      }
      const mapped = countryToDc[incomingCountry.toUpperCase()]
      if (mapped) datacenter = mapped
    }
  }

  if (!datacenter) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""
      const tzToDc = {
        "Asia/Kolkata": "HYD", "Asia/Calcutta": "HYD", "Europe/Bucharest": "OTP",
        "Europe/Paris": "CDG", "Europe/Amsterdam": "AMS", "Europe/London": "LHR",
        "Europe/Berlin": "FRA", "Europe/Frankfurt": "FRA", "America/New_York": "IAD",
        "America/Detroit": "IAD", "America/Los_Angeles": "SJC", "America/Denver": "DEN",
        "America/Chicago": "ORD", "Asia/Tokyo": "NRT"
      }
      const mapped = tzToDc[tz]
      if (mapped) datacenter = mapped
    } catch (e) { /* ignore */ }
  }

  if (!datacenter || !datacenters.includes(datacenter)) datacenter = "AMS"

  const datacenterToCluster = {
    "AMS": "mainnet-ams", "CDG": "mainnet-cdg",
    "OTP": "mainnet-ovh", "HYD": "mainnet-hyd"
  }
  const dynamicCluster = process.env.CDN_CLUSTER || datacenterToCluster[datacenter] || "mainnet-ovh"
  res.setHeader("cluster", dynamicCluster)
  res.setHeader("cf-ray", `${Math.random().toString(16).substring(2, 18)}-${datacenter}`)

  if (!res.getHeader("cf-cache-status")) {
    res.setHeader("cf-cache-status", process.env.CDN_CF_CACHE_STATUS || "DYNAMIC")
  }

  const originalWriteHead = res.writeHead
  res.writeHead = function () {
    Object.keys(res.getHeaders ? res.getHeaders() : {}).forEach(name => {
      if (!ALLOWED_CDN_HEADERS.includes(name.toLowerCase())) {
        res.removeHeader(name)
      }
    })

    for (let i = 0; i < arguments.length; i++) {
      const arg = arguments[i]
      if (arg && typeof arg === "object" && !Array.isArray(arg)) {
        Object.keys(arg).forEach(key => {
          if (!ALLOWED_CDN_HEADERS.includes(key.toLowerCase())) {
            delete arg[key]
          }
        })
      }
    }
    return originalWriteHead.apply(this, arguments)
  }

  next()
})

// Helper to get GitHub path
function getGithubPath(network, type, id = "") {
  const base = networkMap[network]
  let path = base ? `${base}/${type}` : type
  if (id) {
    if (type === "accounts") {
      path = `${path}/${id}.json`
    } else {
      path = `${path}/${id}/info.json`
    }
  }
  return path
}

// Helper to get GitHub Raw URL
function getRawUrl(network, type, id, fileName) {
  const base = networkMap[network]
  if (type === "accounts" && fileName.startsWith("icons/")) {
     return `${GITHUB_RAW_BASE}/${base ? base + "/" : ""}accounts/${fileName}`
  }
  return `${GITHUB_RAW_BASE}/${base ? base + "/" : ""}${type}/${id}/${fileName}`
}

// Helper to sanitize input parameters to prevent path traversal
function sanitize(param) {
  if (typeof param !== "string") return ""
  // Allow alphanumeric characters, underscores, dashes, and dots
  const clean = param.replace(/[^a-zA-Z0-9_.-]/g, "")
  // Prevent path traversal (..) and path separators
  if (clean.includes("..") || clean.includes("/") || clean.includes("\\")) return ""
  return clean
}

// Helper to extract network and type from params
function resolveParams(params) {
  const p1 = sanitize(params.p1)
  const p2 = sanitize(params.p2)
  const p3 = sanitize(params.p3)

  const networks = ["mainnet", "testnet", "devnet"]
  if (networks.includes(p1)) {
    return { network: p1, type: p2, id: p3 }
  }
  // If p1 is not a network, it's the type, and network is mainnet
  return { network: "mainnet", type: p1, id: p2 }
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN

const store = {
  devnet: { tokens: [], identities: [], accounts: [] },
  testnet: { tokens: [], identities: [], accounts: [] },
  mainnet: { tokens: [], identities: [], accounts: [] }
}

const SYNC_INTERVAL = 10 * 60 * 1000 // 10 minutes

/**
 * Helper to fetch from GitHub with optional token
 */
class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function githubFetch(url) {
  const headers = {
    "Accept": "application/vnd.github.v3+json"
  }
  if (GITHUB_TOKEN) {
    headers["Authorization"] = `token ${GITHUB_TOKEN}`
  }
  
  const response = await fetch(url, { headers })
  if (!response.ok) {
     throw new HttpError(response.status, `GitHub API error: ${response.statusText}`)
  }
  return response
}

/**
 * Limit concurrency of promises to avoid abuse detection
 */
async function limitConcurrency(tasks, limit) {
  const results = []
  const executing = []
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task())
    results.push(p)
    if (limit <= tasks.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1))
      executing.push(e)
      if (executing.length >= limit) {
        await Promise.race(executing)
      }
    }
  }
  return Promise.all(results)
}

async function syncCollection(network, type) {
  const path = networkMap[network] ? `${networkMap[network]}/${type}` : type
  console.log(`[Sync] Starting ${network}/${type}${GITHUB_TOKEN ? " (Authenticated)" : " (Unauthenticated)"}...`)
  
  try {
    const response = await githubFetch(`${GITHUB_API_BASE}/contents/${path}?ref=${BRANCH}`)
    const items = await response.json()
    
    if (!Array.isArray(items)) {
      console.warn(`[Sync] Expected array from GitHub but got: ${typeof items}. Skipping ${network}/${type}`)
      return
    }

    const tasks = items.map(item => async () => {
      if (type === "accounts" && item.name.endsWith(".json") && item.name !== "icons") {
        const address = item.name.replace(".json", "")
        try {
          // Use item.download_url which doesn't require API rate limit for raw content
          const fileContent = await fetch(item.download_url).then(r => r.json())
          const accountData = { address, ...fileContent }
          // Only attach icon URLs if the account defines a custom icon key (Production Parity)
          if (fileContent.icon) {
            accountData.iconPng = `/assets-cdn/${network}/accounts/${address}/icon.png`
            accountData.iconSvg = `/assets-cdn/${network}/accounts/${address}/icon.svg`
          }
          return accountData
        } catch (e) { 
          console.error(`[Sync] Failed account ${address}: ${e.message}`)
          return null 
        }
      } else if ((type === "tokens" || type === "identities") && item.type === "dir") {
        const infoUrl = `${GITHUB_RAW_BASE}/${item.path}/info.json`
        try {
          const infoContent = await fetch(infoUrl).then(r => r.json())
          const key = type === "tokens" ? "identifier" : "identity"
          const itemData = { [key]: item.name, ...infoContent }
          if (type === "tokens") {
            itemData.pngUrl = `/assets-cdn/${network}/tokens/${item.name}/icon.png`
            itemData.svgUrl = `/assets-cdn/${network}/tokens/${item.name}/icon.svg`
          } else if (type === "identities") {
            itemData.avatar = `/assets-cdn/${network}/identities/${item.name}/icon.png`
          }
          return itemData
        } catch (e) { 
          console.error(`[Sync] Failed ${type} info for ${item.name}: ${e.message}`)
          return null 
        }
      }
      return null
    })

    const results = await limitConcurrency(tasks, 5) // Sync 5 items at a time
    store[network][type] = results.filter(Boolean)
    console.log(`[Sync] Finished ${network}/${type} (${store[network][type].length} items)`)
  } catch (error) {
    console.error(`[Sync] Failed ${network}/${type}: ${error.message}`)
  }
}

async function syncAll() {
  console.log("--- Starting Global Background Sync ---")
  const networks = ["mainnet", "testnet", "devnet"]
  const types = ["tokens", "identities", "accounts"]
  
  const syncTasks = []
  for (const network of networks) {
    for (const type of types) {
      syncTasks.push(syncCollection(network, type))
    }
  }

  await Promise.all(syncTasks)
  console.log("--- Global Background Sync Completed ---")
}

// Initial sync
syncAll()
setInterval(syncAll, SYNC_INTERVAL)

// Helper to format absolute URLs dynamically matching the requesting client's host/domain
function formatAbsoluteUrls(data, req) {
  if (!data) return data
  const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:3200"
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http"
  const baseUrl = `${protocol}://${host}`

  const process = (val) => {
    if (!val) return val
    if (Array.isArray(val)) {
      return val.map(process)
    }
    if (typeof val === "object") {
      const copy = { ...val }
      for (const key in copy) {
        if (typeof copy[key] === "string" && copy[key].startsWith("/assets-cdn/")) {
          copy[key] = `${baseUrl}${copy[key]}`
        } else if (typeof copy[key] === "object" && copy[key] !== null) {
          copy[key] = process(copy[key])
        }
      }
      return copy
    }
    return val
  }

  return process(data)
}

// Collection Endpoint
app.get("/assets-cdn/:p1/:p2?", async (req, res) => {
  const { p1, p2 } = req.params
  const { network, type } = resolveParams({ p1, p2 })
  
  if (store[network] && store[network][type]) {
    console.log(`[API] Serving ${network}/${type} (${store[network][type].length} items)`)
    return res.json(formatAbsoluteUrls(store[network][type], req))
  }
  
  console.log(`[API] Requested ${network}/${type} but data is not yet available`)
  res.status(404).send("Not found or synchronization in progress")
})

// Single Item and Icon Endpoint
app.get("/assets-cdn/:p1/:p2/:p3?/:p4?", async (req, res) => {
  const { p1, p2, p3 } = req.params
  const p4 = sanitize(req.params.p4)
  let { network, type, id } = resolveParams({ p1, p2, p3 })
  const isIconRequest = (id && p3 && p3.startsWith("icon.")) || (p4 && p4.startsWith("icon."))

  if (isIconRequest) {
    const ext = (p4 || p3).split(".")[1]
    if (!p4) id = p2

    console.log(`Fetching icon: ${network}/${type}/${id}`)

    try {
      let rawUrl
      if (type === "accounts") {
        const accountPath = getGithubPath(network, type, id)
        const accountData = await fetch(`${GITHUB_RAW_BASE}/${accountPath}`).then(r => r.json())
        const iconName = sanitize(accountData.icon || id)
        rawUrl = getRawUrl(network, type, id, `icons/${iconName}.${ext}`)
      } else {
        rawUrl = getRawUrl(network, type, id, `logo.${ext}`)
      }

      const response = await fetch(rawUrl)
      if (!response.ok) return res.status(404).send("Icon not found")
      
      const buffer = await response.arrayBuffer()
      res.setHeader("Content-Type", ext === "svg" ? "image/svg+xml" : "image/png")
      res.send(Buffer.from(buffer))
    } catch (error) {
      console.error(`[Error] ${req.path}:`, error.stack)
      res.status(500).send("Internal Server Error")
    }
  } else {
    // Return from store if possible
    if (store[network] && store[network][type]) {
      const key = type === "accounts" ? "address" : (type === "tokens" ? "identifier" : "identity")
      const item = store[network][type].find(i => i[key] === id)
      if (item) return res.json(formatAbsoluteUrls(item, req))
    }

    // Fallback to direct fetch
    const path = getGithubPath(network, type, id)
    console.log(`Fetching item (fallback): ${path}`)
    
    try {
      const response = await githubFetch(`${GITHUB_RAW_BASE}/${path}`)
      const content = await response.json()
      const key = type === "accounts" ? "address" : (type === "tokens" ? "identifier" : "identity")
      const result = { [key]: id, ...content }
      
      if (type === "tokens") {
        result.pngUrl = `/assets-cdn/${network}/tokens/${id}/icon.png`
        result.svgUrl = `/assets-cdn/${network}/tokens/${id}/icon.svg`
      } else if (type === "identities") {
        result.avatar = `/assets-cdn/${network}/identities/${id}/icon.png`
      } else if (type === "accounts" && content.icon) {
        result.iconPng = `/assets-cdn/${network}/accounts/${id}/icon.png`
        result.iconSvg = `/assets-cdn/${network}/accounts/${id}/icon.svg`
      }
      res.json(formatAbsoluteUrls(result, req))
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        return res.status(404).send("Not found")
      }
      console.error(`[Error] ${req.path}:`, error.stack)
      res.status(500).send("Internal Server Error")
    }
  }
})

if (require.main === module) {
  const listenHost = process.env.ASSETS_PROXY_HOST || "127.0.0.1"
  app.listen(port, listenHost, () => {
    console.log(`GitHub Assets Proxy running at http://${listenHost}:${port}`)
  })
}

// Export helpers for testing
if (typeof module !== "undefined") {
  module.exports = {
    getGithubPath,
    getRawUrl,
    resolveParams,
    networkMap,
    sanitize
  }
}
