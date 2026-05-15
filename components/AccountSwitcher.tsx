"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Plus, Check } from "lucide-react"
import { useEmailStore } from "@/store/emailStore"

const mockAccounts = [
  { id: "acc1", email: "me@example.com", provider: "Google", color: "#EA4335" },
]

export default function AccountSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const [accounts, setAccounts] = useState(mockAccounts)
  const [isAdding, setIsAdding] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newProvider, setNewProvider] = useState("IMAP")
  const [error, setError] = useState("")
  const { selectedAccountId, setSelectedAccountId } = useEmailStore()
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) || accounts[0]

  useEffect(() => {
    if (!selectedAccountId && accounts[0]) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, selectedAccountId, setSelectedAccountId])

  const handleAddAccount = () => {
    const email = newEmail.trim()
    if (!email) {
      setError("Email is required.")
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Enter a valid email address.")
      return
    }
    const id = `acc${Date.now()}`
    const provider = newProvider.trim() || "IMAP"
    const colors = ["#EA4335", "#0A66C2", "#6B7280", "#8B5CF6", "#059669"]
    const account = { id, email, provider, color: colors[accounts.length % colors.length] }
    setAccounts((current) => [...current, account])
    setSelectedAccountId(id)
    setNewEmail("")
    setNewProvider("IMAP")
    setError("")
    setIsAdding(false)
    setIsOpen(false)
  }

  const closeAddDialog = () => {
    setError("")
    setIsAdding(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-label={selectedAccount ? selectedAccount.email : "Select account"}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="account-menu"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
          style={{ backgroundColor: selectedAccount.color }}
        >
          {selectedAccount.email[0].toUpperCase()}
        </div>
        <span className="text-sm text-gray-700 hidden sm:block max-w-32 truncate">
          {selectedAccount.email}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div id="account-menu" role="menu" className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
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
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                    style={{ backgroundColor: account.color }}
                  >
                    {account.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{account.email}</p>
                    <p className="text-xs text-gray-500">{account.provider}</p>
                  </div>
                  {selectedAccount?.id === account.id && (
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100 p-2">
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-blue-600"
              >
                <Plus className="w-4 h-4" />
                Add account
              </button>
            </div>
          </div>
        </>
      )}

      {isAdding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onKeyDown={(event) => {
            if (event.key === "Escape") closeAddDialog()
          }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={closeAddDialog} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-account-title"
            className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-4 space-y-3"
          >
            <h3 id="add-account-title" className="text-sm font-semibold text-gray-900">Add account</h3>
            <label htmlFor="new-account-email" className="text-xs text-gray-600 block">Email</label>
            <input
              id="new-account-email"
              autoFocus
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="name@example.com"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <label htmlFor="new-account-provider" className="text-xs text-gray-600 block">Provider</label>
            <select
              id="new-account-provider"
              value={newProvider}
              onChange={(event) => setNewProvider(event.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="Google">Google</option>
              <option value="Microsoft">Microsoft</option>
              <option value="IMAP">IMAP</option>
            </select>
            {error && (
              <p className="text-xs text-red-600" role="status" aria-live="polite">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeAddDialog} className="px-3 py-1.5 text-sm text-gray-600">
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
