/**
 * Security utilities for Swagger UI
 */

/**
 * Checks if a URL points to a private/internal IP address or unsafe scheme.
 * This is a client-side mitigation for SSRF-style attacks.
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if the URL is considered safe
 */
export const isSafeUrl = (url) => {
  if (!url || typeof url !== "string") return false

  try {
    const parsed = new URL(url)
    
    // Only allow http and https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false

    const hostname = parsed.hostname.toLowerCase()

    // Block localhost and internal IP ranges
    const privateIpRegex = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+)$/
    
    if (privateIpRegex.test(hostname)) return false

    return true
  } catch (e) {
    return false
  }
}

/**
 * Sanitizes an object by removing potentially dangerous keys that could lead to prototype pollution.
 * @param {Object} obj - The object to sanitize
 * @returns {Object} - The sanitized object
 */
export const sanitizeForMerge = (obj) => {
  if (!obj || typeof obj !== "object") return obj

  const dangerousKeys = ["__proto__", "constructor", "prototype"]
  
  const sanitize = (current) => {
    if (!current || typeof current !== "object") return current
    
    if (Array.isArray(current)) {
      return current.map(sanitize)
    }

    const result = {}
    Object.keys(current).forEach(key => {
      if (!dangerousKeys.includes(key)) {
        result[key] = sanitize(current[key])
      } else {
        console.warn(`Security Warning: Blocked potentially dangerous key "${key}" during merge.`)
      }
    })
    return result
  }

  return sanitize(obj)
}
