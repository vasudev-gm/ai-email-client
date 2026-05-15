import {
  summarizeEmail,
  generateReplyDraft,
  prioritizeEmail,
  summarizeEmailWithOptions,
  getTrueSlmStatus,
} from "@/lib/ai"

describe("AI utilities", () => {
  it("summarizeEmail returns placeholder when no API key", async () => {
    const result = await summarizeEmail("Test subject", "Test body")
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })

  it("generateReplyDraft returns string", async () => {
    const result = await generateReplyDraft("Test subject", "Test body", "Test Sender")
    expect(typeof result).toBe("string")
  })

  it("prioritizeEmail returns number 1-5", async () => {
    const result = await prioritizeEmail("Test subject", "Test body", "test@example.com")
    expect(result).toBeGreaterThanOrEqual(1)
    expect(result).toBeLessThanOrEqual(5)
  })

  it("supports heuristic local mode explicitly", async () => {
    const result = await summarizeEmailWithOptions("Subject", "Sentence one. Sentence two.", { localMode: "heuristic" })
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })

  it("exposes true SLM status shape for progress polling", () => {
    const status = getTrueSlmStatus()
    expect(status.mode).toBe("true-slm")
    expect(typeof status.progress).toBe("number")
    expect(typeof status.available).toBe("boolean")
  })
})
