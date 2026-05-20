import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import Credentials from "next-auth/providers/credentials"
import { getEnabledOAuthProviders, resolveAuthSecret } from "@/lib/auth-config"
import { normalizeImapEndpoint, verifyImapConnection } from "@/lib/imap"

function buildAuthProviders() {
  const providers = []
  const enabledProviders = getEnabledOAuthProviders()
  const microsoftTenantId = process.env.MICROSOFT_TENANT_ID?.trim()
  const microsoftAuthority = (process.env.MICROSOFT_AUTHORITY?.trim().toLowerCase() || "common")
  const microsoftIssuerByAuthority: Record<string, string> = {
    common: "https://login.microsoftonline.com/common/v2.0",
    organizations: "https://login.microsoftonline.com/organizations/v2.0",
    consumers: "https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0",
  }
  const resolvedMicrosoftIssuer = microsoftTenantId
    ? `https://login.microsoftonline.com/${microsoftTenantId}/v2.0`
    : (microsoftIssuerByAuthority[microsoftAuthority] ?? microsoftIssuerByAuthority.common)

  if (enabledProviders.includes("google")) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      })
    )
  }

  if (enabledProviders.includes("microsoft-entra-id")) {
    providers.push(
      MicrosoftEntraID({
        clientId: process.env.MICROSOFT_CLIENT_ID!,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        issuer: resolvedMicrosoftIssuer,
        authorization: {
          params: {
            scope: "openid profile email offline_access User.Read Mail.Read Mail.ReadWrite Mail.Send",
          },
        },
      })
    )
  }

  providers.push(
    Credentials({
      name: "IMAP",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        imapHost: { label: "IMAP Host", type: "text" },
        imapPort: { label: "IMAP Port", type: "number" },
      },
      async authorize(credentials) {
        if (
          !credentials?.email ||
          !credentials.password ||
          !credentials.imapHost
        ) {
          return null
        }

        const isDemoMode = credentials.imapHost === "demo.local"
        if (isDemoMode) {
          return {
            id: credentials.email as string,
            email: credentials.email as string,
            name: credentials.email as string,
          }
        }

        const parsedPort = Number(credentials.imapPort ?? 993)
        if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
          return null
        }

        const trimmedHost = String(credentials.imapHost).trim()
        const trimmedEmail = String(credentials.email).trim()
        const password = String(credentials.password)
        const useImplicitTls = parsedPort === 993
        const endpoint = normalizeImapEndpoint(trimmedHost, parsedPort)

        try {
          await verifyImapConnection({
            host: trimmedHost,
            port: parsedPort,
            user: trimmedEmail,
            password,
            tls: useImplicitTls,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown error"
          console.warn("IMAP credentials authorize failed", {
            host: trimmedHost,
            port: parsedPort,
            normalizedHost: endpoint.host,
            normalizedPort: endpoint.port,
            tls: useImplicitTls,
            message,
          })
          return null
        }

        return {
          id: trimmedEmail,
          email: trimmedEmail,
          name: trimmedEmail,
        }
      },
    })
  )

  return providers
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: buildAuthProviders(),
  secret: resolveAuthSecret(),
  trustHost: true,
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider) {
        token.provider = account.provider
      }
      if (account?.access_token) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub ?? ""
        session.provider = typeof token.provider === "string" ? token.provider : undefined
        session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined
      }
      return session
    },
  },
})
