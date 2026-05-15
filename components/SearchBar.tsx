"use client"

import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { useEmailStore } from "@/store/emailStore"

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useEmailStore()
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [localQuery, setSearchQuery])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search emails... (⌘K)"
        value={localQuery}
        onChange={e => setLocalQuery(e.target.value)}
        className="w-full pl-9 pr-8 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 transition-colors"
      />
      {localQuery && (
        <button
          onClick={() => {
            setLocalQuery("")
            setSearchQuery("")
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <X className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
        </button>
      )}
    </div>
  )
}
