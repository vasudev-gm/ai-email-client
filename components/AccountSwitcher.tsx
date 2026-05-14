"use client"

import { useState } from "react"
import { ChevronDown, Plus, Check } from "lucide-react"

const mockAccounts = [
  { id: "acc1", email: "me@example.com", provider: "Google", color: "#EA4335" },
]

export default function AccountSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(mockAccounts[0])

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
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
          <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
            <div className="p-2">
              {mockAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    setSelectedAccount(account)
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
                  {selectedAccount.id === account.id && (
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100 p-2">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-blue-600">
                <Plus className="w-4 h-4" />
                Add account
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
