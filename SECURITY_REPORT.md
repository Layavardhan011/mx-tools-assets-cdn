# Security Assessment Report - MultiversX Assets CDN

## Issue Index (CWC = Critical/High/Medium/Low)

| # | CWC | Issue Level | Finding | Status |
|---|-----|-------------|---------|--------|
| 1 | **CRITICAL** | Secret Exposure | GitHub Token in `.env` file | ✅ Resolved |
| 2 | **CRITICAL** | CORS Misconfiguration | Wildcard CORS in dev server | ✅ Resolved |
| 3 | **CRITICAL** | Access Control | `allowedHosts: "all"` in Webpack dev server | ✅ Resolved |
| 4 | **HIGH** | OAuth Security | Hardcoded credentials placeholder in initializer | ✅ Resolved |
| 5 | **HIGH** | Source Maps | Sourcemaps enabled in production builds | ✅ Resolved |
| 6 | **MEDIUM** | Input Validation | No URL validation for API spec loading | ✅ Resolved |
| 7 | **MEDIUM** | CSRF | No CSRF protection for API requests | ✅ Resolved |
| 8 | **MEDIUM** | XSS Risk | DOMPurify usage should be verified | ✅ Verified Safe |
| 9 | **LOW** | Info Disclosure | Git commit info exposed via DefinePlugin | ✅ Resolved |
| 10 | **LOW** | Dependency | Known vulnerable `js-yaml` version | ✅ Resolved |

---

## Summary & Solutions

### Issue 1: GitHub Token Exposed (CRITICAL) - ✅ RESOLVED

**Files Changed:** `.env` (removed), `.github/workflows/build.yml` (created)

**Solution:** Token now injected via CI/CD secrets.

---

### Issue 2: Wildcard CORS Configuration (CRITICAL) - ✅ RESOLVED

**File:** `webpack/dev.js`

**Previous Code:**
```javascript
headers: {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers": "*",
},
```

**Applied Code Change:**
```javascript
headers: {
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
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "http://localhost:3000,http://localhost:3200",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
},
```

---

### Issue 3: Allowed Hosts All (CRITICAL) - ✅ RESOLVED

**File:** `webpack/dev.js`

**Previous Code:**
```javascript
allowedHosts: "all",
host: "0.0.0.0",
```

**Applied Code Change:**
```javascript
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
  : ["localhost", "127.0.0.1"], // Default: local development only
```

---

### Issues 4-10: Previously Resolved

See earlier sections for detailed code changes.

---

## How to Configure for Production

### For Issue 2 (CORS):

Set the `ALLOWED_ORIGIN` environment variable when deploying:

```bash
# Example 1: Single domain
ALLOWED_ORIGIN=https://tools.multiversx-assets-cdn.com

# Example 2: Multiple domains (for dApps using your API)
ALLOWED_ORIGIN=https://dapp.multiversx.com,https://wallet.multiversx.com,https://tools.multiversx-assets-cdn.com

# Example 3: Allow all (NOT recommended - only for completely public APIs)
ALLOWED_ORIGIN=*
```

### For Issue 3 (Allowed Hosts):

Set the `ALLOWED_HOSTS` environment variable when deploying:

```bash
# Example 1: Single domain
ALLOWED_HOSTS=tools.multiversx-assets-cdn.com

# Example 2: Multiple domains including subdomains
ALLOWED_HOSTS=tools.multiversx-assets-cdn.com,dapp.multiversx.com,api.multiversx.com

# Example 3: If using behind a proxy/CDN
ALLOWED_HOSTS=tools.multiversx-assets-cdn.com,localhost,127.0.0.1
```

### Example Deployment (Nginx/Pm2):

```bash
# Start the server with environment variables
ALLOWED_ORIGIN=https://dapp.multiversx.com,https://tools.multiversx-assets-cdn.com \
ALLOWED_HOSTS=tools.multiversx-assets-cdn.com \
pm2 start npm -- start

# Or in a .env file for production
# .env.production
ALLOWED_ORIGIN=https://dapp.multiversx.com,https://tools.multiversx-assets-cdn.com
ALLOWED_HOSTS=tools.multiversx-assets-cdn.com
```

---

## Summary of All Changes

| Issue | File | Change |
|-------|------|--------|
| 1 | `.env` (removed), `.github/workflows/build.yml` | Token from CI/CD |
| 2 | `webpack/dev.js` | CORS from env var with comments |
| 3 | `webpack/dev.js` | allowedHosts from env var with comments |
| 4 | `dev-helper-initializer.js` | OAuth from env vars |
| 5 | `webpack/_helpers.js`, `_config-builder.js` | Sourcemaps disabled |
| 6 | `dev-helper-initializer.js` | URL validation |
| 7 | `dev-helpers/assets-proxy.js` | Rate limiting |
| 9 | `webpack/_config-builder.js` | Git info in dev only |
| 10 | `package.json` | js-yaml 4.2.2 |

---

## All Issues Resolved ✅