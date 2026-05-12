/// <reference types="cypress" />

describe('Dev Helpers UI', () => {
  beforeEach(() => {
    // The dev helpers are served on localhost:3200 (same as other tests)
    cy.visit('http://localhost:3200/')
  })

  it('loads the index page and contains the swagger UI container', () => {
    // The main swagger UI is rendered inside an element with class "swagger-ui"
    cy.get('#swagger-ui').should('exist')
  })

  it('executes the assets‑proxy helper script without errors', () => {
    // The assets‑proxy helper defines a global function `initAssetsProxy`
    cy.window().then((win) => {
      expect(win).to.have.property('initAssetsProxy')
      // Call it with a dummy URL and ensure it returns a promise
      const result = win.initAssetsProxy('http://example.com')
      expect(result).to.be.a('promise')
    })
  })
})
