import createHtmlReadyId from "core/utils/create-html-ready-id"

describe("createHtmlReadyId", () => {
  it("should replace spaces with underscores by default", () => {
    expect(createHtmlReadyId("my id")).toBe("my_id")
  })

  it("should replace special characters with underscores", () => {
    expect(createHtmlReadyId("my@id#is$cool")).toBe("my_id_is_cool")
  })

  it("should preserve alphanumeric characters and hyphens", () => {
    expect(createHtmlReadyId("my-ID-123")).toBe("my-ID-123")
  })

  it("should use custom replacement character if provided", () => {
    expect(createHtmlReadyId("my id", "-")).toBe("my-id")
  })

  it("should handle empty string", () => {
    expect(createHtmlReadyId("")).toBe("")
  })
})
