"use client"

import { useEmailStore } from "@/store/emailStore"
import { 
  Inbox, Star, Send, FileText, Archive, Trash2, Settings
} from "lucide-react"

interface SidebarProps {
  inboxUnreadCount: number
  deletedCount: number
}

export default function Sidebar({ inboxUnreadCount, deletedCount }: SidebarProps) {
  const folders = [
    { id: "INBOX", label: "Inbox", icon: Inbox, count: inboxUnreadCount },
    { id: "STARRED", label: "Starred", icon: Star },
    { id: "SENT", label: "Sent", icon: Send },
    { id: "DRAFTS", label: "Drafts", icon: FileText },
    { id: "ARCHIVED", label: "Archived", icon: Archive },
    { id: "DELETED", label: "Deleted", icon: Trash2, count: deletedCount > 0 ? deletedCount : undefined },
  ]

  const { currentFolder, setCurrentFolder, setIsSidebarOpen } = useEmailStore()

  const handleFolderClick = (folderId: string) => {
    setCurrentFolder(folderId)
    setIsSidebarOpen(false)
  }

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xl">✉️</span>
          <span className="font-semibold text-lg">AI Mail</span>
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
              {folder.count && (
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
        {[
          { name: "Work", color: "#3B82F6" },
          { name: "Personal", color: "#10B981" },
          { name: "Important", color: "#EF4444" },
        ].map((label) => (
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
