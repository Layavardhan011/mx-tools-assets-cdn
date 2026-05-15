const unitConfig = require("../../../config/jest/jest.unit.config.js")
const artifactConfig = require("../../../config/jest/jest.artifact.config.js")
const path = require("path")

describe("Jest Configuration Integrity", () => {
  describe("Unit Test Config", () => {
    it("should have a valid rootDir", () => {
      const expectedRoot = path.resolve(__dirname, "../../../")
      expect(path.resolve(unitConfig.rootDir)).toBe(expectedRoot)
    })

    it("should use the correct test environment", () => {
      expect(unitConfig.testEnvironment).toBe("jest-environment-jsdom")
    })

    it("should include necessary transform mappings", () => {
      expect(unitConfig.moduleNameMapper).toBeDefined()
      expect(unitConfig.moduleNameMapper["^standalone/(.*)$"]).toBeDefined()
    })
  })

  describe("Artifact Test Config", () => {
    it("should target the build-artifacts directory", () => {
      expect(artifactConfig.testMatch).toContain("**/test/build-artifacts/**/*.js")
    })

    it("should have production-level settings", () => {
      // Artifact tests should run against the 'jsdom' environment
      expect(artifactConfig.testEnvironment).toBe("jsdom")
    })
  })
})
