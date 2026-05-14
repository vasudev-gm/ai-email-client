import { formatEmailDate, extractEmailAddress, extractDisplayName, truncateText } from "@/lib/email-utils"

describe("email-utils", () => {
  describe("extractEmailAddress", () => {
    it("extracts email from formatted string", () => {
      expect(extractEmailAddress("Alice <alice@example.com>")).toBe("alice@example.com")
    })
    it("returns raw email if no angle brackets", () => {
      expect(extractEmailAddress("alice@example.com")).toBe("alice@example.com")
    })
  })
  
  describe("extractDisplayName", () => {
    it("extracts display name from formatted string", () => {
      expect(extractDisplayName("Alice Johnson <alice@example.com>")).toBe("Alice Johnson")
    })
    it("returns email if no display name", () => {
      expect(extractDisplayName("alice@example.com")).toBe("alice@example.com")
    })
  })
  
  describe("truncateText", () => {
    it("truncates long text", () => {
      expect(truncateText("Hello World", 5)).toBe("Hello...")
    })
    it("returns full text if within limit", () => {
      expect(truncateText("Hello", 10)).toBe("Hello")
    })
  })
  
  describe("formatEmailDate", () => {
    it("formats recent dates as time", () => {
      const date = new Date()
      const result = formatEmailDate(date)
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })
})
