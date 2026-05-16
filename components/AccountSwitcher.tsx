"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, Plus, Check } from "lucide-react"
import { useEmailStore } from "@/store/emailStore"
import { signIn, useSession } from "next-auth/react"
import { ACCOUNT_STORAGE_KEY } from "@/lib/account-storage"

type AccountOption = {
  id: string
  email: string
  provider: string
  color: string
}

const mockAccounts: AccountOption[] = [
  { id: "acc1", email: "me@example.com", provider: "Google", color: "#EA4335" },
]
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/
const PROVIDER_COLOR_MAP: Record<string, string> = {
  Google: "#EA4335",
  Microsoft: "#0A66C2",
  Yahoo: "#7E22CE",
  AOL: "#2563EB",
  IMAP: "#6B7280",
}
const IMAP_PROVIDER_DEFAULTS: Record<string, { host: string; port: string }> = {
  Yahoo: { host: "imap.mail.yahoo.com", port: "993" },
  AOL: { host: "imap.aol.com", port: "993" },
  IMAP: { host: "", port: "993" },
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
          Object.prototype.hasOwnProperty.call(PROVIDER_COLOR_MAP, account.provider) &&
          COLOR_REGEX.test(account.color)
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
  const { selectedAccountId, setSelectedAccountId } = useEmailStore()
  const sessionEmail = session?.user?.email
  const sessionAccount = useMemo(
    () =>
      sessionEmail
        ? {
            id: `session-${sessionEmail}`,
            email: sessionEmail,
            provider: "Google",
            color: PROVIDER_COLOR_MAP.Google,
          }
        : null,
    [sessionEmail]
  )
  const accounts = useMemo(
    () => (sessionAccount ? [sessionAccount, ...persistedAccounts] : mockAccounts),
    [sessionAccount, persistedAccounts]
  )
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) || accounts[0]

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
    if (provider in IMAP_PROVIDER_DEFAULTS) {
      const defaults = IMAP_PROVIDER_DEFAULTS[provider]
      setImapHost(defaults.host)
      setImapPort(defaults.port)
    }
  }

  const handleAddAccount = async () => {
    setError("")
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
      return
    }
    if (!EMAIL_REGEX.test(email)) {
      setError("Enter a valid email address.")
      return
    }
    if (!imapHost.trim()) {
      setError("IMAP host is required.")
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
      setError("Couldn't connect account. Please verify IMAP details.")
      return
    }

    const id = `acc${Date.now()}`
    const providerLabel = newProvider === "IMAP" ? "IMAP" : newProvider
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
    setIsAdding(false)
    setIsOpen(false)
  }

  const closeAddDialog = () => {
    setError("")
    setNewProvider("IMAP")
    setIsAdding(false)
  }

  const requiresImapFields = newProvider === "IMAP" || newProvider === "Yahoo" || newProvider === "AOL"

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
                <button
                  key={account.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selectedAccount?.id === account.id}
                  onClick={() => {
                    setSelectedAccountId(account.id)
                    setIsOpen(false)
                  }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                    style={{ backgroundColor: account.color }}
                  >
                    {account.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{account.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{account.provider}</p>
                  </div>
                  {selectedAccount?.id === account.id && (
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>
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
            <label htmlFor="new-account-email" className="text-xs text-gray-600 dark:text-gray-300 block">Email</label>
            <input
              id="new-account-email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="name@example.com"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <label htmlFor="new-account-provider" className="text-xs text-gray-600 dark:text-gray-300 block">Provider</label>
            <select
              id="new-account-provider"
              value={newProvider}
              onChange={(event) => handleProviderChange(event.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="Google">Google</option>
              <option value="Microsoft">Microsoft</option>
              <option value="Yahoo">Yahoo (IMAP)</option>
              <option value="AOL">AOL (IMAP)</option>
              <option value="IMAP">Other IMAP</option>
            </select>
            {requiresImapFields && (
              <>
                <label htmlFor="new-account-imap-host" className="text-xs text-gray-600 dark:text-gray-300 block">IMAP Host</label>
                <input
                  id="new-account-imap-host"
                  value={imapHost}
                  onChange={(event) => setImapHost(event.target.value)}
                  placeholder="imap.example.com"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                />
                <label htmlFor="new-account-imap-port" className="text-xs text-gray-600 dark:text-gray-300 block">IMAP Port</label>
                <input
                  id="new-account-imap-port"
                  value={imapPort}
                  onChange={(event) => setImapPort(event.target.value)}
                  placeholder="993"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                />
                <label htmlFor="new-account-imap-password" className="text-xs text-gray-600 dark:text-gray-300 block">Password / App Password</label>
                <input
                  id="new-account-imap-password"
                  type="password"
                  value={imapPassword}
                  onChange={(event) => setImapPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                />
              </>
            )}
            {error && (
              <p className="text-xs text-red-600" role="status" aria-live="polite">{error}</p>
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
