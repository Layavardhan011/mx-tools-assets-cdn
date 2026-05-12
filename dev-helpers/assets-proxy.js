/* eslint-disable no-console */
const express = require("express")
const cors = require("cors")
const fs = require("fs")
const path = require("path")

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
const port = 3201

// Rate limiting configuration
const rateLimitStore = new Map()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 100 // max requests per window

// Rate limiting middleware
function rateLimitMiddleware(req, res, next) {
  const clientIp = req.ip || req.connection.remoteAddress
  const now = Date.now()
  
  if (!rateLimitStore.has(clientIp)) {
    rateLimitStore.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return next()
  }
  
  const clientData = rateLimitStore.get(clientIp)
  
  if (now > clientData.resetTime) {
    // Reset the counter
    rateLimitStore.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return next()
  }
  
  if (clientData.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again later." })
  }
  
  clientData.count++
  rateLimitStore.set(clientIp, clientData)
  next()
}

// Apply rate limiting
app.use(rateLimitMiddleware)

const REPO_OWNER = "Layavardhan011"
const REPO_NAME = "demo-assets"
const BRANCH = "main"
const GITHUB_API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}`

app.use(cors())

const networkMap = {
  devnet: "devnet",
  testnet: "testnet",
  mainnet: ""
}

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

// Helper to extract network and type from params
function resolveParams(params) {
  const networks = ["mainnet", "testnet", "devnet"]
  if (networks.includes(params.p1)) {
    return { network: params.p1, type: params.p2, id: params.p3 }
  }
  // If p1 is not a network, it's the type, and network is mainnet
  return { network: "mainnet", type: params.p1, id: params.p2 }
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
async function githubFetch(url) {
  const headers = {
    "Accept": "application/vnd.github.v3+json"
  }
  if (GITHUB_TOKEN) {
    headers["Authorization"] = `token ${GITHUB_TOKEN}`
  }
  
  const response = await fetch(url, { headers })
  if (!response.ok) {
     throw new Error(`GitHub API error (${response.status}): ${response.statusText}`)
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
    
    const tasks = items.map(item => async () => {
      if (type === "accounts" && item.name.endsWith(".json") && item.name !== "icons") {
        const address = item.name.replace(".json", "")
        try {
          // Use item.download_url which doesn't require API rate limit for raw content
          const fileContent = await fetch(item.download_url).then(r => r.json())
          return { 
            address, 
            ...fileContent,
            iconPng: `/assets-cdn/${network}/accounts/${address}/icon.png`,
            iconSvg: `/assets-cdn/${network}/accounts/${address}/icon.svg`
          }
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

// Collection Endpoint
app.get("/assets-cdn/:p1/:p2?", async (req, res) => {
  const { p1, p2 } = req.params
  const { network, type } = resolveParams({ p1, p2 })
  
  if (store[network] && store[network][type]) {
    console.log(`[API] Serving ${network}/${type} (${store[network][type].length} items)`)
    return res.json(store[network][type])
  }
  
  console.log(`[API] Requested ${network}/${type} but data is not yet available`)
  res.status(404).send("Not found or synchronization in progress")
})

// Single Item and Icon Endpoint
app.get("/assets-cdn/:p1/:p2/:p3?/:p4?", async (req, res) => {
  const { p1, p2, p3, p4 } = req.params
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
        const iconName = accountData.icon || id
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
      console.error(error)
      res.status(500).send(error.message)
    }
  } else {
    // Return from store if possible
    if (store[network] && store[network][type]) {
      const key = type === "accounts" ? "address" : (type === "tokens" ? "identifier" : "identity")
      const item = store[network][type].find(i => i[key] === id)
      if (item) return res.json(item)
    }

    // Fallback to direct fetch
    const path = getGithubPath(network, type, id)
    console.log(`Fetching item (fallback): ${path}`)
    
    try {
      const response = await githubFetch(`${GITHUB_RAW_BASE}/${path}`)
      const content = await response.json()
      const key = type === "accounts" ? "address" : (type === "tokens" ? "identifier" : "identity")
      res.json({ [key]: id, ...content })
    } catch (error) {
      // Check if it's a 404 from GitHub - return 404 instead of 500
      if (error.message && error.message.includes("404")) {
        return res.status(404).send("Not found")
      }
      console.error(error)
      res.status(500).send(error.message)
    }
  }
})

if (require.main === module) {
  app.listen(port, () => {
    console.log(`GitHub Assets Proxy running at http://localhost:${port}`)
  })
}

// Export helpers for testing
if (typeof module !== "undefined") {
  module.exports = {
    getGithubPath,
    getRawUrl,
    resolveParams,
    networkMap
  }
}
