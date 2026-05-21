"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, Plus, Check, Trash2 } from "lucide-react"
import { useEmailStore } from "@/store/emailStore"
import { signIn, useSession } from "next-auth/react"
import { ACCOUNT_STORAGE_KEY } from "@/lib/account-storage"

type AccountOption = {
  id: string
  email: string
  provider: string
  color: string
  oauthProvider?: "google" | "microsoft-entra-id"
}

const mockAccounts: AccountOption[] = [
  { id: "acc1", email: "me@example.com", provider: "Google", color: "#EA4335" },
]
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/
const PROVIDER_COLOR_MAP: Record<string, string> = {
  Google: "#EA4335",
  "Google (IMAP)": "#EA4335",
  Gmail: "#EA4335",
  Microsoft: "#0A66C2",
  "Microsoft (IMAP)": "#0A66C2",
  Yahoo: "#7E22CE",
  AOL: "#2563EB",
  IMAP: "#6B7280",
}

function toProviderLabel(provider?: string) {
  if (provider === "google") return "Google"
  if (provider === "microsoft-entra-id") return "Microsoft"
  if (provider === "credentials") return "IMAP"
  return "IMAP"
}

function toOauthProvider(provider?: string): AccountOption["oauthProvider"] {
  if (provider === "google") return "google"
  if (provider === "microsoft-entra-id") return "microsoft-entra-id"
  return undefined
}

function createOauthAccount(email: string, provider?: string): AccountOption {
  const normalizedEmail = email.trim().toLowerCase()
  const label = toProviderLabel(provider)
  const oauthProvider = toOauthProvider(provider)
  return {
    id: `oauth-${oauthProvider || "imap"}-${normalizedEmail}`,
    email,
    provider: label,
    color: PROVIDER_COLOR_MAP[label] || PROVIDER_COLOR_MAP.IMAP,
    oauthProvider,
  }
}
const GOOGLE_IMAP_DEFAULTS = { host: "imap.gmail.com", port: "993" }
const IMAP_PROVIDER_DEFAULTS: Record<string, { host: string; port: string }> = {
  GoogleIMAP: GOOGLE_IMAP_DEFAULTS,
  Gmail: GOOGLE_IMAP_DEFAULTS,
  MicrosoftIMAP: { host: "outlook.office365.com", port: "993" },
  Yahoo: { host: "imap.mail.yahoo.com", port: "993" },
  AOL: { host: "imap.aol.com", port: "993" },
  IMAP: { host: "", port: "993" },
}
const IMAP_PROVIDER_LABELS: Record<string, string> = {
  GoogleIMAP: "Google (IMAP)",
  Gmail: "Gmail",
  MicrosoftIMAP: "Microsoft (IMAP)",
  Yahoo: "Yahoo",
  AOL: "AOL",
  IMAP: "IMAP",
}

export default function AccountSwitcher() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [persistedAccounts, setPersistedAccounts] = useState<AccountOption[]>(() => {
    if (typeof window === "undefined") return []
    const storedRaw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY)
    if (!storedRaw) return []
    try {
      const parsed = JSON.parse(storedRaw) as AccountOption[]
      return parsed.filter((account) =>
        Boolean(
          account?.id &&
          EMAIL_REGEX.test(account.email) &&
          account.provider in PROVIDER_COLOR_MAP &&
          COLOR_REGEX.test(account.color) &&
          (!account.oauthProvider || account.oauthProvider === "google" || account.oauthProvider === "microsoft-entra-id")
        )
      )
    } catch {
      return []
    }
  })
  const [isAdding, setIsAdding] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newProvider, setNewProvider] = useState("IMAP")
  const [imapHost, setImapHost] = useState("")
  const [imapPort, setImapPort] = useState("993")
  const [imapPassword, setImapPassword] = useState("")
  const [error, setError] = useState("")
  const [errorField, setErrorField] = useState<"email" | "imapHost" | "imapPassword" | null>(null)
  const { selectedAccountId, setSelectedAccountId } = useEmailStore()
  const sessionEmail = session?.user?.email || ""
  const sessionProvider = session?.provider
  const sessionAccount = useMemo(
    () =>
      sessionEmail
        ? createOauthAccount(sessionEmail, sessionProvider)
        : null,
    [sessionEmail, sessionProvider]
  )
  const accounts = useMemo(() => {
    if (!sessionAccount && persistedAccounts.length === 0) return mockAccounts
    if (!sessionAccount) return persistedAccounts

    const withoutActive = persistedAccounts.filter((account) => account.id !== sessionAccount.id)
    return [sessionAccount, ...withoutActive]
  }, [sessionAccount, persistedAccounts])
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) || accounts[0]

  const removePersistedAccount = (accountId: string) => {
    setPersistedAccounts((current) => current.filter((account) => account.id !== accountId))

    if (selectedAccountId === accountId) {
      const fallbackId =
        (sessionAccount && sessionAccount.id !== accountId ? sessionAccount.id : null) ||
        persistedAccounts.find((account) => account.id !== accountId)?.id ||
        null
      setSelectedAccountId(fallbackId)
    }
  }

  useEffect(() => {
    if (!sessionAccount) return
    setPersistedAccounts((current) => {
      if (current.some((account) => account.id === sessionAccount.id)) return current
      return [sessionAccount, ...current]
    })
  }, [sessionAccount])

  useEffect(() => {
    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(persistedAccounts))
  }, [persistedAccounts])

  useEffect(() => {
    if (!selectedAccountId && accounts[0]) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, selectedAccountId, setSelectedAccountId])

  const handleProviderChange = (provider: string) => {
    setNewProvider(provider)
    setError("")
    setErrorField(null)
    if (provider in IMAP_PROVIDER_DEFAULTS) {
      const defaults = IMAP_PROVIDER_DEFAULTS[provider]
      setImapHost(defaults.host)
      setImapPort(defaults.port)
    }
  }

  const handleAddAccount = async () => {
    setError("")
    setErrorField(null)
    if (newProvider === "Google") {
      await signIn("google", { callbackUrl: "/" })
      return
    }
    if (newProvider === "Microsoft") {
      await signIn("microsoft-entra-id", { callbackUrl: "/" })
      return
    }

    const email = newEmail.trim()
    if (!email) {
      setError("Email is required.")
      setErrorField("email")
      return
    }
    if (!EMAIL_REGEX.test(email)) {
      setError("Enter a valid email address.")
      setErrorField("email")
      return
    }
    const normalizedEmail = email.toLowerCase()
    if (newProvider === "Gmail" && !normalizedEmail.endsWith("@gmail.com")) {
      setError("Use a @gmail.com address for Gmail IMAP.")
      setErrorField("email")
      return
    }
    if (newProvider === "GoogleIMAP" && normalizedEmail.endsWith("@gmail.com")) {
      setError("Use Gmail (IMAP direct) for @gmail.com addresses by selecting it in Provider.")
      setErrorField("email")
      return
    }
    if (!imapHost.trim()) {
      setError("IMAP host is required.")
      setErrorField("imapHost")
      return
    }
    if (!imapPassword.trim()) {
      setError("Password is required.")
      setErrorField("imapPassword")
      return
    }

    const connectResult = await signIn("credentials", {
      email,
      password: imapPassword,
      imapHost: imapHost.trim(),
      imapPort: imapPort.trim() || "993",
      redirect: false,
    })
    if (!connectResult?.ok) {
      const reason = connectResult?.error ? ` (${connectResult.error})` : ""
      setError(`Couldn't connect account. Check credentials and IMAP host/port${reason}.`)
      setErrorField(null)
      return
    }

    const id = `acc${Date.now()}`
    const providerLabel = IMAP_PROVIDER_LABELS[newProvider] || newProvider
    const account = {
      id,
      email,
      provider: providerLabel,
      color: PROVIDER_COLOR_MAP[providerLabel] || PROVIDER_COLOR_MAP.IMAP,
    }
    setPersistedAccounts((current) => [...current, account])
    setSelectedAccountId(id)
    setNewEmail("")
    setNewProvider("IMAP")
    setImapHost("")
    setImapPort("993")
    setImapPassword("")
    setError("")
    setErrorField(null)
    setIsAdding(false)
    setIsOpen(false)
  }

  const closeAddDialog = () => {
    setError("")
    setErrorField(null)
    setNewProvider("IMAP")
    setIsAdding(false)
  }

  const requiresImapFields = newProvider in IMAP_PROVIDER_DEFAULTS
  const customImapSelected = newProvider === "IMAP"
  const emailError = errorField === "email"
  const imapHostError = errorField === "imapHost"
  const imapPasswordError = errorField === "imapPassword"

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-label={selectedAccount ? selectedAccount.email : "Select account"}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="account-menu"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
          style={{ backgroundColor: selectedAccount.color }}
        >
          {selectedAccount.email[0].toUpperCase()}
        </div>
        <span className="text-sm text-gray-700 dark:text-gray-200 hidden sm:block max-w-32 truncate">
          {selectedAccount.email}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div id="account-menu" role="menu" className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
            <div className="p-2">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={selectedAccount?.id === account.id}
                    onClick={() => {
                      if (account.oauthProvider && account.id !== sessionAccount?.id) {
                        setSelectedAccountId(account.id)
                        setIsOpen(false)
                        void signIn(account.oauthProvider, {
                          callbackUrl: "/",
                          login_hint: account.email,
                        })
                        return
                      }

                      setSelectedAccountId(account.id)
                      setIsOpen(false)
                    }}
                    className="flex-1 flex items-center gap-3 px-1 py-1 text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{ backgroundColor: account.color }}
                    >
                      {account.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{account.email}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{account.provider}</p>
                    </div>
                    {selectedAccount?.id === account.id && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                  {persistedAccounts.some((storedAccount) => storedAccount.id === account.id) && (
                    <button
                      type="button"
                      aria-label={`Remove account ${account.email}`}
                      onClick={() => removePersistedAccount(account.id)}
                      className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700 p-2">
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm text-blue-600 dark:text-blue-400"
              >
                <Plus className="w-4 h-4" />
                Add account
              </button>
            </div>
          </div>
        </>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeAddDialog} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-account-title"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeAddDialog()
            }}
            className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm p-4 space-y-3 border border-transparent dark:border-gray-700"
          >
            <h3 id="add-account-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">Add account</h3>
            <label htmlFor="new-account-email" className="text-sm font-medium text-gray-700 dark:text-gray-200 block">Email</label>
            <input
              id="new-account-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              aria-invalid={emailError}
              aria-describedby={emailError ? "new-account-error" : undefined}
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="name@example.com"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <label htmlFor="new-account-provider" className="text-sm font-medium text-gray-700 dark:text-gray-200 block">Provider</label>
            <select
              id="new-account-provider"
              value={newProvider}
              onChange={(event) => handleProviderChange(event.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="Gmail">Gmail (IMAP direct)</option>
              <option value="GoogleIMAP">Google Workspace (IMAP fallback)</option>
              <option value="MicrosoftIMAP">Microsoft (IMAP fallback)</option>
              <option value="Yahoo">Yahoo (IMAP)</option>
              <option value="AOL">AOL (IMAP)</option>
              <option value="IMAP">Other IMAP</option>
              <option value="Google">Google (OAuth2 custom sign-in)</option>
              <option value="Microsoft">Microsoft (OAuth2 custom sign-in)</option>
            </select>
            {requiresImapFields && (
              <fieldset className="space-y-2" aria-describedby={customImapSelected ? "custom-imap-help" : undefined}>
                <legend className="text-sm font-medium text-gray-700 dark:text-gray-200">IMAP settings</legend>
                {customImapSelected && (
                  <p id="custom-imap-help" className="text-xs text-gray-600 dark:text-gray-300">
                    Enter your provider&apos;s IMAP server and app password.
                  </p>
                )}
                <label htmlFor="new-account-imap-host" className="text-sm font-medium text-gray-700 dark:text-gray-200 block">IMAP Host</label>
                <input
                  id="new-account-imap-host"
                  aria-invalid={imapHostError}
                  aria-describedby={
                    [customImapSelected ? "custom-imap-help" : null, imapHostError ? "new-account-error" : null]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                  value={imapHost}
                  onChange={(event) => setImapHost(event.target.value)}
                  placeholder="imap.example.com"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                />
                <label htmlFor="new-account-imap-port" className="text-sm font-medium text-gray-700 dark:text-gray-200 block">IMAP Port</label>
                <input
                  id="new-account-imap-port"
                  type="number"
                  min="1"
                  max="65535"
                  inputMode="numeric"
                  value={imapPort}
                  onChange={(event) => setImapPort(event.target.value)}
                  placeholder="993"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                />
                <label htmlFor="new-account-imap-password" className="text-sm font-medium text-gray-700 dark:text-gray-200 block">Password / App Password</label>
                <input
                  id="new-account-imap-password"
                  type="password"
                  autoComplete="off"
                  aria-invalid={imapPasswordError}
                  aria-describedby={imapPasswordError ? "new-account-error" : undefined}
                  value={imapPassword}
                  onChange={(event) => setImapPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                />
              </fieldset>
            )}
            {error && (
              <p id="new-account-error" className="text-xs text-red-600" role="status" aria-live="polite">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeAddDialog} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                Cancel
              </button>
              <button type="button" onClick={handleAddAccount} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded">
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
