import { NextResponse } from "next/server"
import { getEnabledOAuthProviders } from "@/lib/auth-config"

function isTruthy(value?: string) {
  return Boolean(value && value.trim())
}

export async function GET() {
  const providers = getEnabledOAuthProviders()
  const microsoftTenantId = process.env.MICROSOFT_TENANT_ID?.trim()
  const microsoftAuthority = (process.env.MICROSOFT_AUTHORITY?.trim().toLowerCase() || "common")

  return NextResponse.json({
    google: {
      enabled: providers.includes("google"),
      missing: [
        !isTruthy(process.env.GOOGLE_CLIENT_ID) ? "GOOGLE_CLIENT_ID" : null,
        !isTruthy(process.env.GOOGLE_CLIENT_SECRET) ? "GOOGLE_CLIENT_SECRET" : null,
      ].filter(Boolean),
    },
    microsoft: {
      enabled: providers.includes("microsoft-entra-id"),
      tenantScoped: Boolean(microsoftTenantId),
      tenantIdConfigured: Boolean(microsoftTenantId),
      authority: microsoftTenantId ? "tenant" : microsoftAuthority,
      missing: [
        !isTruthy(process.env.MICROSOFT_CLIENT_ID) ? "MICROSOFT_CLIENT_ID" : null,
        !isTruthy(process.env.MICROSOFT_CLIENT_SECRET) ? "MICROSOFT_CLIENT_SECRET" : null,
      ].filter(Boolean),
    },
  })
}
