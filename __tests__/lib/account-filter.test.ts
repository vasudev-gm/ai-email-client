import { toApiAccountId } from "@/lib/account-filter"

describe("toApiAccountId", () => {
  it("returns null for session account ids", () => {
    expect(toApiAccountId("session-demo@example.com")).toBeNull()
  })

  it("returns account id for persisted account ids", () => {
    expect(toApiAccountId("acc1")).toBe("acc1")
  })

  it("returns null for empty selection", () => {
    expect(toApiAccountId(null)).toBeNull()
  })
})
