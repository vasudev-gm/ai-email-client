export type OAuthProviderName = "google" | "microsoft-entra-id"

export function getEnabledOAuthProviders(env: NodeJS.ProcessEnv = process.env): OAuthProviderName[] {
  const providers: OAuthProviderName[] = []

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.push("google")
  }

  if (env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET) {
    providers.push("microsoft-entra-id")
  }

  return providers
}

export function resolveAuthSecret(env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (env.NEXTAUTH_SECRET) return env.NEXTAUTH_SECRET
  if (env.AUTH_SECRET) return env.AUTH_SECRET
  if (env.NODE_ENV !== "production") return "dev-only-insecure-secret"
  return undefined
}
