export function toApiAccountId(selectedAccountId: string | null): string | null {
  if (!selectedAccountId) return null
  if (selectedAccountId.startsWith("session-") || selectedAccountId.startsWith("oauth-")) return null
  return selectedAccountId
}
