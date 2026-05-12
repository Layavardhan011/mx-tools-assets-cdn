import { canJsonParse, getKnownSyntaxHighlighterLanguage } from "core/utils/jsonParse"

describe("jsonParse utils", () => {
  describe("canJsonParse", () => {
    it("should return true for valid JSON object string", () => {
      expect(canJsonParse('{"a": 1}')).toBe(true)
    })

    it("should return true for valid JSON array string", () => {
      expect(canJsonParse('[1, 2, 3]')).toBe(true)
    })

    it("should return null for invalid JSON string", () => {
      expect(canJsonParse('{"a": 1')).toBe(null)
    })

    it("should return null for non-JSON string", () => {
      expect(canJsonParse('hello world')).toBe(null)
    })
  })

  describe("getKnownSyntaxHighlighterLanguage", () => {
    it('should return "json" for valid JSON string', () => {
      expect(getKnownSyntaxHighlighterLanguage('{"a": 1}')).toBe("json")
    })

    it("should return null for non-JSON string", () => {
      expect(getKnownSyntaxHighlighterLanguage('hello world')).toBe(null)
    })
  })
})
