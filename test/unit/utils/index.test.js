import { fromJS, Map, List } from "immutable"
import * as utils from "core/utils"

describe("core utils", () => {
  describe("isImmutable", () => {
    it("should return true for Immutable Map", () => {
      expect(utils.isImmutable(Map())).toBe(true)
    })
    it("should return true for Immutable List", () => {
      expect(utils.isImmutable(List())).toBe(true)
    })
    it("should return false for plain object", () => {
      expect(utils.isImmutable({})).toBe(false)
    })
    it("should return false for null", () => {
      expect(utils.isImmutable(null)).toBe(false)
    })
  })

  describe("immutableToJS", () => {
    it("should convert Immutable Map to plain JS object", () => {
      const imm = fromJS({ a: 1, b: 2 })
      expect(utils.immutableToJS(imm)).toEqual({ a: 1, b: 2 })
    })
    it("should return plain object as is", () => {
      const obj = { a: 1 }
      expect(utils.immutableToJS(obj)).toBe(obj)
    })
  })

  describe("arrayify", () => {
    it("should return empty array for null/undefined", () => {
      expect(utils.arrayify(null)).toEqual([])
      expect(utils.arrayify(undefined)).toEqual([])
    })
    it("should convert Immutable List to array", () => {
      const imm = fromJS([1, 2, 3])
      expect(utils.arrayify(imm)).toEqual([1, 2, 3])
    })
    it("should wrap single value in array", () => {
      expect(utils.arrayify("test")).toEqual(["test"])
    })
  })

  describe("pascalCase", () => {
    it("should convert snake_case to PascalCase", () => {
      expect(utils.pascalCase("hello_world")).toBe("HelloWorld")
    })
    it("should convert kebab-case to PascalCase", () => {
      expect(utils.pascalCase("hello-world")).toBe("HelloWorld")
    })
    it("should convert space separated to PascalCase", () => {
      expect(utils.pascalCase("hello world")).toBe("HelloWorld")
    })
  })

  describe("stringify", () => {
    it("should return string as is", () => {
      expect(utils.stringify("hello")).toBe("hello")
    })
    it("should stringify plain objects with indentation", () => {
      const obj = { a: 1 }
      expect(utils.stringify(obj)).toBe(JSON.stringify(obj, null, 2))
    })
    it("should stringify Immutable objects", () => {
      const imm = fromJS({ a: 1 })
      expect(utils.stringify(imm)).toBe(JSON.stringify({ a: 1 }, null, 2))
    })
    it("should return empty string for null/undefined", () => {
      expect(utils.stringify(null)).toBe("")
      expect(utils.stringify(undefined)).toBe("")
    })
  })
})
