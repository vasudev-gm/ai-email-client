"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { signOut, useSession } from "next-auth/react"
import Sidebar from "@/components/Sidebar"
import EmailList from "@/components/EmailList"
import EmailViewer from "@/components/EmailViewer"
import Composer from "@/components/Composer"
import SearchBar from "@/components/SearchBar"
import AccountSwitcher from "@/components/AccountSwitcher"
import ThemeToggle from "@/components/ThemeToggle"
import { useEmailStore } from "@/store/emailStore"
import { EmailData, extractEmailAddress } from "@/lib/email-utils"
import { ACCOUNT_STORAGE_KEY } from "@/lib/account-storage"
import { toApiAccountId } from "@/lib/account-filter"
import { PenSquare, Menu, LogOut, RefreshCw } from "lucide-react"

type FolderId = "INBOX" | "STARRED" | "SENT" | "DRAFTS" | "ARCHIVED" | "JUNK" | "DELETED"
type FolderCountMap = Record<FolderId, number>
type ToastState = {
  message: string
  tone: "success" | "error"
}

class ApiRequestError extends Error {
  status: number
  source?: string
  code?: string
  apiStatus?: string
  reauthRequired?: boolean
  setupRequired?: boolean

  constructor(message: string, options: {
    status: number
    source?: string
    code?: string
    apiStatus?: string
    reauthRequired?: boolean
    setupRequired?: boolean
  }) {
    super(message)
    this.name = "ApiRequestError"
    this.status = options.status
    this.source = options.source
    this.code = options.code
    this.apiStatus = options.apiStatus
    this.reauthRequired = options.reauthRequired
    this.setupRequired = options.setupRequired
  }
}

const FOLDERS: FolderId[] = ["INBOX", "STARRED", "SENT", "DRAFTS", "ARCHIVED", "JUNK", "DELETED"]

const EMPTY_COUNTS: FolderCountMap = {
  INBOX: 0,
  STARRED: 0,
  SENT: 0,
  DRAFTS: 0,
  ARCHIVED: 0,
  JUNK: 0,
  DELETED: 0,
}

function getAccountQuery(selectedAccountId: string | null) {
  const apiAccountId = toApiAccountId(selectedAccountId)
  return apiAccountId ? `&accountId=${encodeURIComponent(apiAccountId)}` : ""
}

async function fetchFolderCounts(selectedAccountId: string | null) {
  const accountQuery = getAccountQuery(selectedAccountId)
  const response = await fetch(`/api/emails?folder=ALL&countOnly=1&unreadOnly=1${accountQuery}`)
  const payload = await response.json()
  if (!response.ok) {
    throw new ApiRequestError(
      payload?.error || `Failed to fetch folder counts (status: ${response.status})`,
      {
        status: response.status,
        source: payload?.source,
        code: payload?.code,
        apiStatus: payload?.apiStatus,
        reauthRequired: payload?.reauthRequired,
        setupRequired: payload?.setupRequired,
      }
    )
  }
  const folderCounts = {
    INBOX: Number(payload?.folderCounts?.INBOX || 0),
    STARRED: Number(payload?.folderCounts?.STARRED || 0),
    SENT: Number(payload?.folderCounts?.SENT || 0),
    DRAFTS: Number(payload?.folderCounts?.DRAFTS || 0),
    ARCHIVED: Number(payload?.folderCounts?.ARCHIVED || 0),
    JUNK: Number(payload?.folderCounts?.JUNK || 0),
    DELETED: Number(payload?.folderCounts?.DELETED || 0),
  } as FolderCountMap

  const inboxUnreadCount = Number(payload?.inboxUnreadCount ?? folderCounts.INBOX)

  return {
    inboxUnreadCount,
    folderCounts,
  }
}

async function fetchVisibleEmails(folder: string, searchQuery: string, selectedAccountId: string | null) {
  const params = new URLSearchParams()
  params.set("folder", folder)
  if (searchQuery) params.set("search", searchQuery)
  const apiAccountId = toApiAccountId(selectedAccountId)
  if (apiAccountId) params.set("accountId", apiAccountId)
  const response = await fetch(`/api/emails?${params}`)
  const data = await response.json()
  if (!response.ok) {
    throw new ApiRequestError(
      data?.error || `Failed to fetch emails (status: ${response.status})`,
      {
        status: response.status,
        source: data?.source,
        code: data?.code,
        apiStatus: data?.apiStatus,
        reauthRequired: data?.reauthRequired,
        setupRequired: data?.setupRequired,
      }
    )
  }
  return data.emails || []
}

export default function Home() {
  const { data: session, status } = useSession()
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
  const [folderCounts, setFolderCounts] = useState<FolderCountMap>(EMPTY_COUNTS)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [isProviderSetupBlocked, setIsProviderSetupBlocked] = useState(false)
  const [syncClockTick, setSyncClockTick] = useState(0)
  const [composeDraft, setComposeDraft] = useState<{
    to?: string
    subject?: string
    content?: string
  } | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)
  const isAuthenticated = status === "authenticated" && Boolean(session?.user?.email)

  const showToast = useCallback((message: string, tone: ToastState["tone"] = "success") => {
    setToast({ message, tone })
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current)
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimeoutRef.current = null
    }, 2800)
  }, [])

  const prefixSubject = useCallback((subject: string, prefix: "Re:" | "Fwd:") => {
    const trimmed = subject.trim()
    if (!trimmed) return `${prefix} (no subject)`
    return trimmed.toLowerCase().startsWith(prefix.toLowerCase()) ? trimmed : `${prefix} ${trimmed}`
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.replace("/login")
    }
  }, [status])

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setIsProviderSetupBlocked(false)
  }, [selectedAccountId, session?.provider])

  const refreshFolderCounts = useCallback(async () => {
    if (!isAuthenticated) return
    const counts = await fetchFolderCounts(selectedAccountId)
    setInboxUnreadCount(counts.inboxUnreadCount)
    setFolderCounts(counts.folderCounts)
  }, [selectedAccountId, isAuthenticated])

  const syncVisibleEmails = useCallback(async (withLoading = false, syncAllFolders = false, force = false) => {
    if (!isAuthenticated) return
    if (isProviderSetupBlocked && !force) return
    if (withLoading) setLoading(true)

    try {
      const [visibleEmails] = await Promise.all([
        fetchVisibleEmails(currentFolder, searchQuery, selectedAccountId),
        syncAllFolders ? refreshFolderCounts() : Promise.resolve(),
      ])
      setEmails(visibleEmails)
      setLastSyncedAt(new Date())
      setSyncError(null)
      setIsProviderSetupBlocked(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error"
      setSyncError(message)
      if (error instanceof ApiRequestError && error.setupRequired) {
        setIsProviderSetupBlocked(true)
      }
      throw error
    } finally {
      if (withLoading) setLoading(false)
    }
  }, [currentFolder, searchQuery, selectedAccountId, refreshFolderCounts, isAuthenticated, isProviderSetupBlocked])

  const lastSyncedLabel = (() => {
    void syncClockTick
    if (!lastSyncedAt) return "Last synced: pending"
    const secondsAgo = Math.max(0, Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000))
    if (secondsAgo < 5) return "Synced just now"
    if (secondsAgo < 60) return `Synced ${secondsAgo}s ago`
    const minutesAgo = Math.floor(secondsAgo / 60)
    if (minutesAgo < 60) return `Synced ${minutesAgo}m ago`
    const hoursAgo = Math.floor(minutesAgo / 60)
    return `Synced ${hoursAgo}h ago`
  })()

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSyncClockTick((tick) => tick + 1)
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const fetchEmails = async () => {
      if (!isAuthenticated) return
      try {
        await syncVisibleEmails(true, true)
      } catch {
        // Error is already captured in syncError state by syncVisibleEmails.
      }
    }
    void fetchEmails()
  }, [syncVisibleEmails, isAuthenticated])

  const handleManualSync = useCallback(async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      await syncVisibleEmails(false, true, true)
      setSyncError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error"
      setSyncError(message)
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, syncVisibleEmails])

  useEffect(() => {
    let isCancelled = false
    const fetchEmail = async () => {
      if (!isAuthenticated) return
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
  }, [selectedEmailId, refreshFolderCounts, isAuthenticated])

  const handleSendEmail = async (data: {
    to: string
    cc?: string
    bcc?: string
    subject: string
    content: string
  }) => {
    const response = await fetch("/api/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const message = await response.text()
      throw new Error(message || `Failed to send email (status: ${response.status})`)
    }
    setIsComposeOpen(false)
    setComposeDraft(null)
    void syncVisibleEmails()
  }

  const handleReply = useCallback(() => {
    if (!selectedEmail) {
      setComposeDraft(null)
      setIsComposeOpen(true)
      return
    }

    const quotedBody = (selectedEmail.bodyText || "").trim()
    const replyPrefix = `\n\nOn ${new Date(selectedEmail.date).toLocaleString()}, ${selectedEmail.from} wrote:\n`

    setComposeDraft({
      to: extractEmailAddress(selectedEmail.from),
      subject: prefixSubject(selectedEmail.subject, "Re:"),
      content: quotedBody ? `${replyPrefix}> ${quotedBody.split("\n").join("\n> ")}` : "",
    })
    setIsComposeOpen(true)
  }, [selectedEmail, prefixSubject, setIsComposeOpen])

  const handleForward = useCallback(() => {
    if (!selectedEmail) {
      setComposeDraft(null)
      setIsComposeOpen(true)
      return
    }

    const originalBody = (selectedEmail.bodyText || "").trim()
    const forwardedHeader = [
      "",
      "",
      "---------- Forwarded message ----------",
      `From: ${selectedEmail.from}`,
      `Date: ${new Date(selectedEmail.date).toLocaleString()}`,
      `Subject: ${selectedEmail.subject}`,
      `To: ${selectedEmail.to}`,
      "",
    ].join("\n")

    setComposeDraft({
      to: "",
      subject: prefixSubject(selectedEmail.subject, "Fwd:"),
      content: `${forwardedHeader}${originalBody}`,
    })
    setIsComposeOpen(true)
  }, [selectedEmail, prefixSubject, setIsComposeOpen])

  const handleBulkAction = useCallback(async (
    ids: string[],
    action: "archive" | "unarchive" | "delete" | "star" | "markRead" | "markUnread" | "restore" | "notSpam"
  ) => {
    const actionPayloadMap: Record<typeof action, Record<string, boolean>> = {
      archive: { isArchived: true },
      unarchive: { isArchived: false },
      delete: { isDeleted: true },
      star: { isStarred: true },
      markRead: { isRead: true },
      markUnread: { isRead: false },
      restore: { isDeleted: false },
      notSpam: { isJunk: false },
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
      showToast("Some emails could not be updated.", "error")
      return
    }

    if (action === "notSpam") {
      const movedCount = ids.length
      showToast(movedCount === 1 ? "Moved 1 email to Inbox." : `Moved ${movedCount} emails to Inbox.`)
    }

    const refreshedEmails = await fetchVisibleEmails(currentFolder, searchQuery, selectedAccountId)
    setEmails(refreshedEmails)
    void refreshFolderCounts()
  }, [currentFolder, searchQuery, selectedAccountId, refreshFolderCounts, showToast])

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

  const handleNotSpamEmail = useCallback(async () => {
    if (!selectedEmailId) return
    const response = await fetch(`/api/emails/${selectedEmailId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isJunk: false }),
    })
    if (!response.ok) {
      console.error(`Failed to mark email as not spam (status: ${response.status})`)
      showToast("Could not move email to Inbox.", "error")
      return
    }
    setEmails((current) => current.filter((email) => email.id !== selectedEmailId))
    setSelectedEmailId(null)
    setSelectedEmail(null)
    void refreshFolderCounts()
    showToast("Moved to Inbox.")
  }, [selectedEmailId, setSelectedEmailId, refreshFolderCounts, showToast])

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 text-gray-500 dark:text-gray-300">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 overflow-hidden">
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
        <Sidebar inboxUnreadCount={inboxUnreadCount} folderCounts={folderCounts} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
         <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
          >
            <Menu className="w-5 h-5" />
          </button>
           <div className="flex-1 min-w-0">
             <SearchBar />
             <div className="mt-1 px-1 flex items-center gap-2">
               <p className="text-xs text-gray-500 dark:text-gray-300">{lastSyncedLabel}</p>
               <button
                 type="button"
                 onClick={() => void handleManualSync()}
                 disabled={isSyncing}
                 className="text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 inline-flex items-center gap-1"
                 aria-label="Sync inbox"
               >
                 <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                 {isSyncing ? "Syncing" : "Sync"}
               </button>
               {syncError ? (
                   <button
                     type="button"
                     onClick={() => void handleManualSync()}
                     disabled={isSyncing}
                     className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                     role="status"
                     aria-live="polite"
                   >
                     Sync failed. Retry
                   </button>
               ) : null}
             </div>
           </div>
            <ThemeToggle />
            <AccountSwitcher />
            <button
              onClick={async () => {
                localStorage.removeItem(ACCOUNT_STORAGE_KEY)
                try {
                  await signOut({ callbackUrl: "/login" })
                } catch (error) {
                  console.error("Sign out failed:", error)
                  window.location.replace("/login")
                }
              }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
           <button
             onClick={() => {
               setComposeDraft(null)
               setIsComposeOpen(true)
             }}
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
            w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto
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
            flex-1 bg-white dark:bg-gray-900 overflow-y-auto
            ${selectedEmailId ? "block" : "hidden md:flex md:items-center md:justify-center"}
          `}>
            {selectedEmail ? (
                <EmailViewer
                  email={selectedEmail}
                  onBack={() => setSelectedEmailId(null)}
                  onReply={handleReply}
                  onForward={handleForward}
                  onDelete={handleDeleteEmail}
                  onRestore={handleRestoreEmail}
                  onNotSpam={handleNotSpamEmail}
                />
            ) : (
              <div className="text-center text-gray-400 dark:text-gray-400">
                <div className="text-6xl mb-4">✉️</div>
                <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Select an email to read</p>
                <p className="text-sm mt-1 text-gray-500 dark:text-gray-300">Choose from your {currentFolder.toLowerCase()} on the left</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Composer */}
      <Composer
        isOpen={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false)
          setComposeDraft(null)
        }}
        onSend={handleSendEmail}
        draft={composeDraft || undefined}
      />

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50" role="status" aria-live="polite">
          <div
            className={`px-3 py-2 rounded-lg text-sm shadow-lg border ${toast.tone === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700"
              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </div>
  )
}
