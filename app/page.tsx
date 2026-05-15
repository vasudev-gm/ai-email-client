"use client"

import { useState, useEffect, useCallback } from "react"
import Sidebar from "@/components/Sidebar"
import EmailList from "@/components/EmailList"
import EmailViewer from "@/components/EmailViewer"
import Composer from "@/components/Composer"
import SearchBar from "@/components/SearchBar"
import AccountSwitcher from "@/components/AccountSwitcher"
import { useEmailStore } from "@/store/emailStore"
import { EmailData } from "@/lib/email-utils"
import { PenSquare, Menu } from "lucide-react"

function getAccountQuery(selectedAccountId: string | null) {
  return selectedAccountId ? `&accountId=${encodeURIComponent(selectedAccountId)}` : ""
}

async function fetchFolderCounts(selectedAccountId: string | null) {
  const accountQuery = getAccountQuery(selectedAccountId)
  const [inboxRes, deletedRes] = await Promise.all([
    fetch(`/api/emails?folder=INBOX${accountQuery}`),
    fetch(`/api/emails?folder=DELETED${accountQuery}`),
  ])
  const [inboxData, deletedData] = await Promise.all([inboxRes.json(), deletedRes.json()])
  return {
    inboxUnreadCount: (inboxData.emails || []).filter((email: EmailData) => !email.isRead).length,
    deletedCount: (deletedData.emails || []).length,
  }
}

async function fetchVisibleEmails(folder: string, searchQuery: string, selectedAccountId: string | null) {
  const params = new URLSearchParams()
  params.set("folder", folder)
  if (searchQuery) params.set("search", searchQuery)
  if (selectedAccountId) params.set("accountId", selectedAccountId)
  const response = await fetch(`/api/emails?${params}`)
  const data = await response.json()
  return data.emails || []
}

export default function Home() {
  const {
    selectedEmailId,
    currentFolder,
    searchQuery,
    selectedAccountId,
    isComposeOpen,
    isSidebarOpen,
    setSelectedEmailId,
    setIsComposeOpen,
    setIsSidebarOpen,
  } = useEmailStore()

  const [emails, setEmails] = useState<EmailData[]>([])
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0)
  const [deletedCount, setDeletedCount] = useState(0)

  const refreshFolderCounts = useCallback(async () => {
    const counts = await fetchFolderCounts(selectedAccountId)
    setInboxUnreadCount(counts.inboxUnreadCount)
    setDeletedCount(counts.deletedCount)
  }, [selectedAccountId])

  useEffect(() => {
    let isCancelled = false
    const fetchEmails = async () => {
      setLoading(true)

      try {
        const visibleEmails = await fetchVisibleEmails(currentFolder, searchQuery, selectedAccountId)
        if (!isCancelled) {
          setEmails(visibleEmails)
          void refreshFolderCounts()
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }
    void fetchEmails()
    return () => {
      isCancelled = true
    }
  }, [currentFolder, searchQuery, selectedAccountId, refreshFolderCounts])

  useEffect(() => {
    let isCancelled = false
    const fetchEmail = async () => {
      if (!selectedEmailId) {
        if (!isCancelled) {
          setSelectedEmail(null)
        }
        return
      }

      try {
        const response = await fetch(`/api/emails/${selectedEmailId}`)
        if (!response.ok) throw new Error(`Failed to fetch email (status: ${response.status})`)
        const data = await response.json()
        if (!isCancelled) {
          setSelectedEmail(data)
          let shouldSetReadLocally = data.isRead
          if (!data.isRead) {
            const markReadResponse = await fetch(`/api/emails/${selectedEmailId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isRead: true }),
            })
            if (markReadResponse.ok) {
              shouldSetReadLocally = true
              void refreshFolderCounts()
            }
          }
          if (shouldSetReadLocally) {
            setEmails((current) =>
              current.map((email) =>
                email.id === selectedEmailId ? { ...email, isRead: true } : email
              )
            )
          }
        }
      } catch {
        if (!isCancelled) {
          setSelectedEmail(null)
        }
      }
    }
    void fetchEmail()
    return () => {
      isCancelled = true
    }
  }, [selectedEmailId, refreshFolderCounts])

  const handleSendEmail = async (data: {
    to: string
    cc?: string
    bcc?: string
    subject: string
    content: string
  }) => {
    await fetch("/api/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    setIsComposeOpen(false)
  }

  const handleBulkAction = useCallback(async (
    ids: string[],
    action: "archive" | "star" | "markRead" | "markUnread" | "restore"
  ) => {
    const actionPayloadMap: Record<typeof action, Record<string, boolean>> = {
      archive: { isArchived: true },
      star: { isStarred: true },
      markRead: { isRead: true },
      markUnread: { isRead: false },
      restore: { isDeleted: false },
    }

    const responses = await Promise.all(
      ids.map((id) =>
        fetch(`/api/emails/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(actionPayloadMap[action]),
        })
      )
    )
    const failedIds = responses
      .map((response, index) => (!response.ok ? ids[index] : null))
      .filter((id): id is string => Boolean(id))
    if (failedIds.length > 0) {
      console.error(`Bulk email update failed for IDs: ${failedIds.join(", ")}`)
      return
    }

    const refreshedEmails = await fetchVisibleEmails(currentFolder, searchQuery, selectedAccountId)
    setEmails(refreshedEmails)
    void refreshFolderCounts()
  }, [currentFolder, searchQuery, selectedAccountId, refreshFolderCounts])

  const handleDeleteEmail = useCallback(async () => {
    if (!selectedEmailId) return
    const response = await fetch(`/api/emails/${selectedEmailId}`, { method: "DELETE" })
    if (!response.ok) {
      console.error(`Failed to delete email (status: ${response.status})`)
      return
    }
    setEmails((current) => current.filter((email) => email.id !== selectedEmailId))
    setSelectedEmailId(null)
    setSelectedEmail(null)
    void refreshFolderCounts()
  }, [selectedEmailId, setSelectedEmailId, refreshFolderCounts])

  const handleRestoreEmail = useCallback(async () => {
    if (!selectedEmailId) return
    const response = await fetch(`/api/emails/${selectedEmailId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDeleted: false }),
    })
    if (!response.ok) {
      console.error(`Failed to restore email (status: ${response.status})`)
      return
    }
    setEmails((current) => current.filter((email) => email.id !== selectedEmailId))
    setSelectedEmailId(null)
    setSelectedEmail(null)
    void refreshFolderCounts()
  }, [selectedEmailId, setSelectedEmailId, refreshFolderCounts])

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:relative inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <Sidebar inboxUnreadCount={inboxUnreadCount} deletedCount={deletedCount} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <SearchBar />
          </div>
          <AccountSwitcher />
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <PenSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Compose</span>
          </button>
        </header>

        {/* Email panels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Email list */}
          <div className={`
            w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto
            ${selectedEmailId ? "hidden md:block" : "block"}
          `}>
            <EmailList
              emails={emails}
              currentFolder={currentFolder}
              selectedEmailId={selectedEmailId}
              onSelectEmail={setSelectedEmailId}
              onBulkAction={handleBulkAction}
              loading={loading}
            />
          </div>

          {/* Email viewer */}
          <div className={`
            flex-1 bg-white overflow-y-auto
            ${selectedEmailId ? "block" : "hidden md:flex md:items-center md:justify-center"}
          `}>
            {selectedEmail ? (
                <EmailViewer
                  email={selectedEmail}
                  onBack={() => setSelectedEmailId(null)}
                  onReply={() => setIsComposeOpen(true)}
                  onDelete={handleDeleteEmail}
                  onRestore={handleRestoreEmail}
                />
            ) : (
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-4">✉️</div>
                <p className="text-lg font-medium">Select an email to read</p>
                <p className="text-sm mt-1">Choose from your {currentFolder.toLowerCase()} on the left</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Composer */}
      <Composer
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSendEmail}
      />
    </div>
  )
}
