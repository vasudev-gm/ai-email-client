"use client"

import { EmailData, formatEmailDate, extractDisplayName, truncateText } from "@/lib/email-utils"
import { Star } from "lucide-react"

interface EmailListProps {
  emails: EmailData[]
  selectedEmailId: string | null
  onSelectEmail: (id: string) => void
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

export default function EmailList({ emails, selectedEmailId, onSelectEmail, loading }: EmailListProps) {
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
