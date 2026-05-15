import { getEnabledOAuthProviders, resolveAuthSecret } from "@/lib/auth-config"

describe("auth config", () => {
  it("enables no OAuth providers when env vars are absent", () => {
    const providers = getEnabledOAuthProviders({})
    expect(providers).toHaveLength(0)
  })

  it("adds OAuth providers only when env vars are present", () => {
    const providers = getEnabledOAuthProviders({
      GOOGLE_CLIENT_ID: "gid",
      GOOGLE_CLIENT_SECRET: "gsecret",
      MICROSOFT_CLIENT_ID: "mid",
      MICROSOFT_CLIENT_SECRET: "msecret",
    })
    expect(providers).toEqual(["google", "microsoft-entra-id"])
  })

  it("uses a dev secret fallback outside production", () => {
    const secret = resolveAuthSecret({ NODE_ENV: "development" })
    expect(secret).toBe("dev-only-insecure-secret")
  })
})
