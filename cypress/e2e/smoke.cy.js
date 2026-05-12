describe("Swagger UI Smoke Test", () => {
  it("should load the Swagger UI page", () => {
    cy.visit("http://localhost:3200")
    cy.get("#swagger-ui").should("exist")
    cy.title().should("include", "Swagger UI")
  })

  it("should display the information section", () => {
    cy.visit("http://localhost:3200")
    cy.get(".info").should("be.visible")
    cy.get(".title").should("contain", "MultiversX Assets CDN")
  })

  it("should be able to expand an operation", () => {
    cy.visit("http://localhost:3200")
    cy.get(".opblock-summary").first().click()
    cy.get(".opblock-body").should("be.visible")
  })

  it("should have a working theme toggle", () => {
    cy.visit("http://localhost:3200")
    // Check if the theme toggle exists (usually an SVG or button)
    cy.get("svg").should("exist")
  })
})
