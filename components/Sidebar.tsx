"use client"

import { useMemo, useState } from "react"
import { useEmailStore } from "@/store/emailStore"
import {
  Inbox, Star, Send, FileText, Archive, ShieldAlert, Trash2, Settings, X
} from "lucide-react"

interface SidebarProps {
  inboxUnreadCount: number
  folderCounts: {
    INBOX: number
    STARRED: number
    SENT: number
    DRAFTS: number
    ARCHIVED: number
    JUNK: number
    DELETED: number
  }
  labels: string[]
  onAddCustomLabel: (label: string) => void
}

export default function Sidebar({ inboxUnreadCount, folderCounts, labels, onAddCustomLabel }: SidebarProps) {
  const [newLabel, setNewLabel] = useState("")
  const folders = [
    { id: "INBOX", label: "Inbox", icon: Inbox, count: inboxUnreadCount > 0 ? inboxUnreadCount : undefined },
    { id: "STARRED", label: "Starred", icon: Star, count: folderCounts.STARRED > 0 ? folderCounts.STARRED : undefined },
    { id: "SENT", label: "Sent", icon: Send, count: folderCounts.SENT > 0 ? folderCounts.SENT : undefined },
    { id: "DRAFTS", label: "Drafts", icon: FileText, count: folderCounts.DRAFTS > 0 ? folderCounts.DRAFTS : undefined },
    { id: "ARCHIVED", label: "Archived", icon: Archive, count: folderCounts.ARCHIVED > 0 ? folderCounts.ARCHIVED : undefined },
    { id: "JUNK", label: "Spam", icon: ShieldAlert, count: folderCounts.JUNK > 0 ? folderCounts.JUNK : undefined },
    { id: "DELETED", label: "Deleted", icon: Trash2, count: folderCounts.DELETED > 0 ? folderCounts.DELETED : undefined },
  ]

  const { currentFolder, setCurrentFolder, setIsSidebarOpen } = useEmailStore()
  const labelColors = useMemo(() => {
    const palette = ["#3B82F6", "#10B981", "#EF4444", "#F59E0B", "#8B5CF6", "#06B6D4", "#84CC16"]
    return labels.map((label, index) => ({ name: label, color: palette[index % palette.length] }))
  }, [labels])

  const handleFolderClick = (folderId: string) => {
    setCurrentFolder(folderId)
    setIsSidebarOpen(false)
  }

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">✉️</span>
            <span className="font-semibold text-lg">AI Mail</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
          Folders
        </div>
        {folders.map((folder) => {
          const Icon = folder.icon
          const isActive = currentFolder === folder.id
          return (
            <button
              key={folder.id}
              onClick={() => handleFolderClick(folder.id)}
              className={`
                w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                ${isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{folder.label}</span>
              </div>
              {typeof folder.count === "number" && folder.count > 0 && (
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                  isActive ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-300"
                }`}>
                  {folder.count}
                </span>
              )}
            </button>
          )
        })}

        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 mt-4">
          Labels
        </div>
        {labelColors.map((label) => (
          <button
            key={label.name}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: label.color }}
            />
            <span>{label.name}</span>
          </button>
        ))}

        <div className="mt-2 px-3">
          <div className="text-[11px] text-gray-500 mb-1">Add custom label</div>
          <div className="flex items-center gap-1">
            <input
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              placeholder="Custom label"
              className="flex-1 min-w-0 text-xs px-2 py-1 rounded bg-gray-800 text-gray-100 border border-gray-700"
              aria-label="Add custom label"
            />
            <button
              type="button"
              onClick={() => {
                const trimmed = newLabel.trim()
                if (!trimmed) return
                onAddCustomLabel(trimmed)
                setNewLabel("")
              }}
              disabled={!newLabel.trim()}
              className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      </nav>

      <div className="p-3 border-t border-gray-700">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  )
}
