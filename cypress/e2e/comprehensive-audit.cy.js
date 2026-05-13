describe("Comprehensive Security & Functional Audit", () => {
  const proxyUrl = "http://localhost:3201"
  const uiUrl = "http://localhost:3200"

  describe("1. Security Hardening Audit", () => {
    it("should provide essential security headers on proxy responses", () => {
      cy.request(proxyUrl + "/assets-cdn/devnet/tokens").then((response) => {
        // Verify Helmet-provided headers
        expect(response.headers).to.have.property("x-content-type-options", "nosniff")
        expect(response.headers).to.have.property("x-frame-options", "SAMEORIGIN")
        expect(response.headers).to.have.property("cross-origin-resource-policy", "cross-origin")
      })
    })

    it("should include rate-limiting headers", () => {
      cy.request(proxyUrl + "/assets-cdn/devnet/tokens").then((response) => {
        expect(response.headers).to.have.property("ratelimit-limit")
        expect(response.headers).to.have.property("ratelimit-remaining")
      })
    })

    it("should prevent SSRF via IP-based parameters", () => {
      // Attempting to trick the resolver into hitting an internal IP
      const internalIp = "169.254.169.254"
      cy.request({
        url: `${proxyUrl}/assets-cdn/devnet/tokens/${internalIp}`,
        failOnStatusCode: false
      }).then((response) => {
        // The sanitize function should strip the dots or the resolver should fail safely
        expect(response.status).to.not.eq(200)
      })
    })

    it("should block URL-encoded path traversal attempts", () => {
      // %2e%2e%2f is ../
      cy.request({
        url: `${proxyUrl}/assets-cdn/%2e%2e%2f%2e%2e%2fpackage.json`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.not.eq(200)
      })
    })
  })

  describe("2. Functional Parity Audit", () => {
    const networks = ["mainnet", "testnet", "devnet"]
    const collections = ["tokens", "identities", "accounts"]

    networks.forEach((network) => {
      collections.forEach((collection) => {
        it(`should successfully fetch ${collection} collection for ${network}`, () => {
          cy.request(`${proxyUrl}/assets-cdn/${network}/${collection}`).then((response) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.be.an("array")
            
            // Check basic schema if collection is not empty
            if (response.body.length > 0) {
              const item = response.body[0]
              if (collection === "tokens") expect(item).to.have.property("identifier")
              if (collection === "identities") expect(item).to.have.property("identity")
              if (collection === "accounts") expect(item).to.have.property("address")
            }
          })
        })
      })
    })

    it("should resolve token icons with correct content-types", () => {
      // Check a known token (e.g. EGLD on mainnet)
      cy.request({
        url: `${proxyUrl}/assets-cdn/mainnet/tokens/EGLD-bd4d79/icon.png`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.headers["content-type"]).to.include("image/png")
        }
      })

      cy.request({
        url: `${proxyUrl}/assets-cdn/mainnet/tokens/EGLD-bd4d79/icon.svg`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.headers["content-type"]).to.include("image/svg+xml")
        }
      })
    })

    it("should handle non-existent items with a 404", () => {
      cy.request({
        url: `${proxyUrl}/assets-cdn/devnet/tokens/NON_EXISTENT_TOKEN_12345`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(404)
        expect(response.body).to.not.contain("stack") // Ensure no stack trace leakage
      })
    })
  })

  describe("3. UI Integration Audit", () => {
    it("should load the Swagger documentation spec successfully", () => {
      cy.visit(uiUrl)
      // Check if the spec file was loaded correctly by looking for the Title
      cy.get(".info .title", { timeout: 10000 }).should("contain", "MultiversX Assets CDN")
    })

    it("should have all major categories in the UI", () => {
      cy.visit(uiUrl)
      cy.get("#operations-tag-tokens").should("be.visible")
      cy.get("#operations-tag-identities").should("be.visible")
      cy.get("#operations-tag-accounts").should("be.visible")
    })
  })
})
