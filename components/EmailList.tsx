"use client"

import { useMemo, useState } from "react"
import { EmailData, formatEmailDate, extractDisplayName, truncateText } from "@/lib/email-utils"
import { Star } from "lucide-react"

interface EmailListProps {
  emails: EmailData[]
  selectedEmailId: string | null
  onSelectEmail: (id: string) => void
  onBulkAction?: (ids: string[], action: "archive" | "star") => Promise<void> | void
  loading?: boolean
}

const priorityColors: Record<number, string> = {
  5: "bg-red-100 text-red-700",
  4: "bg-orange-100 text-orange-700",
  3: "bg-yellow-100 text-yellow-700",
  2: "bg-green-100 text-green-700",
  1: "bg-gray-100 text-gray-600",
}

const priorityLabels: Record<number, string> = {
  5: "Urgent",
  4: "High",
  3: "Med",
  2: "Low",
  1: "Min",
}

export default function EmailList({ emails, selectedEmailId, onSelectEmail, onBulkAction, loading }: EmailListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectableIds = useMemo(() => emails.map((email) => email.id), [emails])
  const allSelected = selectableIds.length > 0 && selectedIds.length === selectableIds.length

  const toggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : selectableIds)
  }

  const runBulkAction = (action: "archive" | "star") => {
    if (!selectedIds.length || !onBulkAction) return
    onBulkAction(selectedIds, action)
    setSelectedIds([])
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <div className="text-4xl mb-3">📭</div>
        <p className="font-medium">No emails found</p>
        <p className="text-sm mt-1">Your folder is empty</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      <div className="sticky top-0 z-10 bg-white px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
          Select all
        </label>
        <div className="flex items-center gap-2">
          <button
            disabled={selectedIds.length === 0}
            onClick={() => runBulkAction("star")}
            className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-700 disabled:opacity-40"
          >
            Star selected
          </button>
          <button
            disabled={selectedIds.length === 0}
            onClick={() => runBulkAction("archive")}
            className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 disabled:opacity-40"
          >
            Archive selected
          </button>
        </div>
      </div>
      {emails.map((email) => (
        <button
          key={email.id}
          onClick={() => onSelectEmail(email.id)}
          className={`
            w-full text-left p-4 hover:bg-gray-50 transition-colors
            ${selectedEmailId === email.id ? "bg-blue-50 border-l-2 border-l-blue-600" : ""}
            ${!email.isRead ? "bg-white" : "bg-gray-50/50"}
          `}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="checkbox"
                checked={selectedIds.includes(email.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleSelection(email.id)}
                aria-label={`Select ${email.subject}`}
              />
              {!email.isRead && (
                <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
              )}
              <span className={`text-sm truncate ${!email.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-600"}`}>
                {extractDisplayName(email.from)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {email.isStarred && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
              {email.aiPriority && email.aiPriority >= 4 && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${priorityColors[email.aiPriority]}`}>
                  {priorityLabels[email.aiPriority]}
                </span>
              )}
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {formatEmailDate(email.date)}
              </span>
            </div>
          </div>
          <p className={`text-sm truncate mb-1 ${!email.isRead ? "font-medium text-gray-800" : "text-gray-600"}`}>
            {email.subject}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {truncateText(email.bodyText || "", 80)}
          </p>
        </button>
      ))}
    </div>
  )
}
