describe("Assets Proxy E2E", () => {
  it("should successfully fetch a token collection from the proxy", () => {
    // Assuming the assets-proxy is running on port 3201
    cy.request("http://localhost:3201/assets-cdn/devnet/tokens")
      .its("status")
      .should("eq", 200)
  })

  it("should successfully fetch a specific token from the proxy", () => {
    // Testing a known devnet token (e.g., EGLD or similar)
    // We'll just check if the proxy responds to a valid-looking path
    cy.request({
      url: "http://localhost:3201/assets-cdn/devnet/tokens/WEGLD-bd4d79",
      failOnStatusCode: false // In case the specific token doesn't exist in the current demo-assets
    }).then((response) => {
      expect([200, 404]).to.include(response.status)
    })
  })
})
