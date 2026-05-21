import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
    provider?: string
    accessToken?: string
    error?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    provider?: string
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    error?: string
  }
}
