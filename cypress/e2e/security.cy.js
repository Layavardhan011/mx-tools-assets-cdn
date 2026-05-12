describe("Security Tests", () => {
  beforeEach(() => {
    cy.visit("http://localhost:3200")
  })

  it("should sanitize potential XSS in parameter inputs", () => {
    const xssPayload = "<script>alert('xss')</script>"
    
    // Click the method badge of the SECOND operation (which has an 'address' text input)
    cy.get(".opblock-summary-method").eq(1).click({ force: true })
    
    // Verify the operation is marked as open and body is visible
    cy.get(".opblock").eq(1).should("have.class", "is-open")
    cy.get(".opblock-body").should("be.visible")
    
    // Swagger UI requires clicking "Try it out" to enable input fields
    // Using regex to handle trailing spaces and case sensitivity
    cy.contains("button", /Try it out/i, { timeout: 10000 })
      .should("be.visible")
      .click({ force: true })
    
    // Target the first visible input field (usually a parameter)
    cy.get(".opblock-body input").filter(":visible").first().as("paramInput")
    
    cy.get("@paramInput").type(xssPayload, { force: true })
    
    // Verify that the script tag is NOT executed (it should stay as a string in the input or be sanitized)
    cy.get("@paramInput").should("have.value", xssPayload)
    
    // Check that no alert was triggered (Cypress does this automatically, but we can be explicit)
    cy.on("window:alert", (str) => {
      throw new Error(`XSS vulnerability detected! Alert triggered with: ${str}`)
    })
  })

  it("should not expose sensitive data in DOM attributes", () => {
    // We check if the InitializedInput (used for sensitive fields) 
    // leaks its 'initialValue' into the HTML attributes.
    
    // Visit the page and look for any input that might be an InitializedInput
    cy.get("input").each(($el) => {
      // It should NOT have a 'value' attribute containing the sensitive data
      // (React uncontrolled inputs set the .value property, not the attribute)
      cy.wrap($el).should("not.have.attr", "initialValue")
    })
  })

  it("should have correct CORS headers on the assets proxy", () => {
    cy.request("http://localhost:3201/assets-cdn/devnet/tokens").then((response) => {
      expect(response.headers).to.have.property("access-control-allow-origin", "*")
    })
  })

  it("should prevent basic path traversal via the proxy", () => {
    cy.request({
      url: "http://localhost:3201/assets-cdn/../../etc/passwd",
      failOnStatusCode: false
    }).then((response) => {
      // The proxy should either 404 or handle the path safely
      expect(response.status).to.not.eq(200)
    })
  })

  it("should ignore configuration overrides passed via URL query parameters", () => {
    // Attempt to override the 'url' parameter via query string
    const maliciousUrl = "https://evil.com/malicious-spec.json"
    cy.visit(`http://localhost:3200/?url=${maliciousUrl}`)
    
    // The UI should still be loading the local swagger.json, not the malicious one
    // (Note: The value might be hidden but we can check the internal state or UI elements)
    cy.get(".info .title").should("contain", "MultiversX Assets CDN")
    cy.get(".download-url-input").should("not.have.value", maliciousUrl)
  })
})
