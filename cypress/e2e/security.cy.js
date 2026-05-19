describe("Security Tests", () => {
  beforeEach(() => {
    cy.visit("http://localhost:3200")
  })

  it("should sanitize potential XSS in parameter inputs", () => {
    const xssPayload = "<script>alert('xss')</script>"

    cy.get(".opblock-summary-method").eq(1).click({ force: true })

    cy.get(".opblock").eq(1).should("have.class", "is-open")
    cy.get(".opblock-body").should("be.visible")

    cy.contains("button", /Try it out/i, { timeout: 10000 })
      .should("be.visible")
      .click({ force: true })

    cy.get(".opblock-body input").filter(":visible").first().as("paramInput")

    cy.get("@paramInput").type(xssPayload, { force: true })

    cy.get("@paramInput").should("have.value", xssPayload)

    cy.on("window:alert", (str) => {
      throw new Error(`XSS vulnerability detected! Alert triggered with: ${str}`)
    })
  })

  it("should not expose sensitive data in DOM attributes", () => {
    cy.get("input").each(($el) => {
      cy.wrap($el).should("not.have.attr", "initialValue")
    })
  })

  it("should have wildcard CORS header on the assets proxy (CDN-aligned)", () => {
    const allowedOrigin = "http://localhost:3200"
    cy.request({
      url: "http://localhost:3201/assets-cdn/devnet/tokens",
      headers: {
        Origin: allowedOrigin
      }
    }).then((response) => {
      expect(response.headers).to.have.property("access-control-allow-origin", "*")
    })
  })

  it("should have wildcard CORS header regardless of origin (CDN-aligned)", () => {
    const unauthorizedOrigin = "https://unauthorized-domain.com"

    cy.request({
      url: "http://localhost:3201/assets-cdn/devnet/tokens",
      headers: {
        Origin: unauthorizedOrigin,
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.headers).to.have.property("access-control-allow-origin", "*")
    })
  })

  it("should prevent basic path traversal via the proxy", () => {
    cy.request({
      url: "http://localhost:3201/assets-cdn/../../etc/passwd",
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.not.eq(200)
    })
  })

  it("should ignore configuration overrides passed via URL query parameters", () => {
    const maliciousUrl = "https://evil.com/malicious-spec.json"
    cy.visit(`http://localhost:3200/?url=${maliciousUrl}`)

    cy.get(".info .title", { timeout: 10000 }).should("contain", "MultiversX Assets CDN")
    cy.get(".download-url-input").should("not.have.value", maliciousUrl)
  })
})
