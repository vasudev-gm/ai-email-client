import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import Credentials from "next-auth/providers/credentials"
import { getEnabledOAuthProviders, resolveAuthSecret } from "@/lib/auth-config"

function buildAuthProviders() {
  const providers = []
  const enabledProviders = getEnabledOAuthProviders()

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
        if (!credentials?.email) return null
        return {
          id: credentials.email as string,
          email: credentials.email as string,
          name: credentials.email as string,
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
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub ?? ""
      }
      return session
    },
  },
})
