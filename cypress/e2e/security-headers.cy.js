describe("Security Headers", () => {
  it("should return X-Content-Type-Options: nosniff on the UI server", () => {
    cy.request("http://localhost:3200/").then((response) => {
      expect(response.headers).to.have.property("x-content-type-options", "nosniff")
    })
  })

  it("should return X-Frame-Options: DENY on the UI server", () => {
    cy.request("http://localhost:3200/").then((response) => {
      expect(response.headers).to.have.property("x-frame-options", "DENY")
    })
  })

  it("should return Strict-Transport-Security on the UI server", () => {
    cy.request("http://localhost:3200/").then((response) => {
      expect(response.headers).to.have.property("strict-transport-security")
      expect(response.headers["strict-transport-security"]).to.include("max-age=31536000")
    })
  })

  it("should return Content-Security-Policy on the UI server", () => {
    cy.request("http://localhost:3200/").then((response) => {
      expect(response.headers).to.have.property("content-security-policy")
      expect(response.headers["content-security-policy"]).to.include("default-src 'self'")
    })
  })

  it("should return Referrer-Policy on the UI server", () => {
    cy.request("http://localhost:3200/").then((response) => {
      expect(response.headers).to.have.property("referrer-policy")
    })
  })

  it("should return Cross-Origin-Opener-Policy on the UI server", () => {
    cy.request("http://localhost:3200/").then((response) => {
      expect(response.headers).to.have.property("cross-origin-opener-policy", "same-origin")
    })
  })

  it("should not return security headers on assets-cdn paths (CDN parity)", () => {
    cy.request("http://localhost:3201/assets-cdn/devnet/tokens").then((response) => {
      expect(response.headers).to.not.have.property("x-frame-options")
      expect(response.headers).to.not.have.property("x-content-type-options")
      expect(response.headers).to.not.have.property("content-security-policy")
    })
  })
})
