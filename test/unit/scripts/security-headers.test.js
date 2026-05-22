const securityHeadersModule = require("../../../scripts/security-headers")
const securityHeaders = securityHeadersModule.default || securityHeadersModule

const { ALLOWED_CDN_HEADERS, applySecurityHeaders, createSecurityHeaders } = securityHeaders

const EXPECTED_STATIC_HEADERS = {
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

describe("Security Headers Module", () => {
  describe("ALLOWED_CDN_HEADERS", () => {
    it("should define the allowed CDN header list", () => {
      expect(ALLOWED_CDN_HEADERS).toBeDefined()
      expect(Array.isArray(ALLOWED_CDN_HEADERS)).toBe(true)
      expect(ALLOWED_CDN_HEADERS.length).toBeGreaterThan(0)
    })

    it("should include strict-transport-security", () => {
      expect(ALLOWED_CDN_HEADERS).toContain("strict-transport-security")
    })
  })

  describe("STATIC_HEADERS", () => {
    it("should define X-Content-Type-Options: nosniff", () => {
      expect(EXPECTED_STATIC_HEADERS["X-Content-Type-Options"]).toBe("nosniff")
    })

    it("should define X-Frame-Options: DENY", () => {
      expect(EXPECTED_STATIC_HEADERS["X-Frame-Options"]).toBe("DENY")
    })

    it("should define Strict-Transport-Security with includeSubDomains", () => {
      expect(EXPECTED_STATIC_HEADERS["Strict-Transport-Security"]).toContain("includeSubDomains")
    })

    it("should define Content-Security-Policy with self and unsafe-inline", () => {
      const csp = EXPECTED_STATIC_HEADERS["Content-Security-Policy"]
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'")
      expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    })

    it("should allow GitHub raw content in img-src", () => {
      const csp = EXPECTED_STATIC_HEADERS["Content-Security-Policy"]
      expect(csp).toContain("https://raw.githubusercontent.com")
    })

    it("should not include upgrade-insecure-requests (handled by HSTS)", () => {
      const csp = EXPECTED_STATIC_HEADERS["Content-Security-Policy"]
      expect(csp).not.toContain("upgrade-insecure-requests")
    })
  })

  describe("createSecurityHeaders middleware", () => {
    it("should return a middleware function", () => {
      const middleware = createSecurityHeaders()
      expect(typeof middleware).toBe("function")
      expect(middleware.length).toBe(3)
    })

    it("should call next() for asset paths without setting non-CDN headers", () => {
      const middleware = createSecurityHeaders()
      const req = { path: "/assets-cdn/mainnet/tokens", url: "/assets-cdn/mainnet/tokens" }
      const res = { setHeader: jest.fn() }
      const next = jest.fn()

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.setHeader).not.toHaveBeenCalledWith("X-Content-Type-Options", "nosniff")
    })

    it("should set security headers for non-asset paths", () => {
      const middleware = createSecurityHeaders()
      const req = { path: "/", url: "/", headers: { origin: "http://localhost:3200" } }
      const res = { setHeader: jest.fn() }
      const next = jest.fn()

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff")
      expect(res.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY")
      expect(res.setHeader).toHaveBeenCalledWith("Strict-Transport-Security", expect.stringContaining("max-age=31536000"))
    })
  })

  describe("applySecurityHeaders", () => {
    it("should do nothing if headers already sent", () => {
      const req = { path: "/", url: "/", headers: {} }
      const res = { setHeader: jest.fn(), headersSent: true }

      applySecurityHeaders(req, res)

      expect(res.setHeader).not.toHaveBeenCalled()
    })

    it("should skip asset paths", () => {
      const req = { path: "/assets-cdn/mainnet/tokens", url: "/assets-cdn/mainnet/tokens" }
      const res = { setHeader: jest.fn(), headersSent: false }

      applySecurityHeaders(req, res)

      expect(res.setHeader).not.toHaveBeenCalledWith("X-Content-Type-Options", "nosniff")
    })

    it("should set all security headers for regular paths", () => {
      const req = { path: "/", url: "/", headers: {} }
      const res = { setHeader: jest.fn(), headersSent: false }

      applySecurityHeaders(req, res)

      expect(res.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff")
      expect(res.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY")
      expect(res.setHeader).toHaveBeenCalledWith("Referrer-Policy", "no-referrer-when-downgrade")
      expect(res.setHeader).toHaveBeenCalledWith("X-Permitted-Cross-Domain-Policies", "none")
    })
  })
})
