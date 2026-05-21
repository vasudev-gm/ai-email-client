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

  it("heuristic summary surfaces action-oriented sentences", async () => {
    const body = "This is a short intro. Please review the budget proposal by Friday and confirm approval. Team lunch is next week."
    const result = await summarizeEmailWithOptions("Budget proposal", body, { localMode: "heuristic" })
    expect(result.toLowerCase()).toContain("please review")
  })

  it("heuristic draft includes extracted action points when present", async () => {
    const draft = await generateReplyDraft(
      "Q4 timeline",
      "Could you share the updated milestones by tomorrow? Please include owners and blockers.",
      "Alex Johnson"
    )
    expect(draft).toContain("I noted the following points")
    expect(draft).toContain("- Could you share the updated milestones by tomorrow?")
  })

  it("exposes true SLM status shape for progress polling", () => {
    const status = getTrueSlmStatus()
    expect(status.mode).toBe("true-slm")
    expect(typeof status.progress).toBe("number")
    expect(typeof status.available).toBe("boolean")
  })
})
