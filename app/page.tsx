"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import EmailList from "@/components/EmailList"
import EmailViewer from "@/components/EmailViewer"
import Composer from "@/components/Composer"
import SearchBar from "@/components/SearchBar"
import AccountSwitcher from "@/components/AccountSwitcher"
import { useEmailStore } from "@/store/emailStore"
import { EmailData } from "@/lib/email-utils"
import { PenSquare, Menu } from "lucide-react"

export default function Home() {
  const {
    selectedEmailId,
    currentFolder,
    searchQuery,
    isComposeOpen,
    isSidebarOpen,
    setSelectedEmailId,
    setIsComposeOpen,
    setIsSidebarOpen,
  } = useEmailStore()

  const [emails, setEmails] = useState<EmailData[]>([])
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("folder", currentFolder)
    if (searchQuery) params.set("search", searchQuery)
    
    fetch(`/api/emails?${params}`)
      .then(r => r.json())
      .then(data => {
        setEmails(data.emails || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [currentFolder, searchQuery])

  useEffect(() => {
    if (selectedEmailId) {
      fetch(`/api/emails/${selectedEmailId}`)
        .then(r => r.json())
        .then(data => setSelectedEmail(data))
        .catch(() => setSelectedEmail(null))
    } else {
      setSelectedEmail(null)
    }
  }, [selectedEmailId])

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
        <Sidebar />
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
              selectedEmailId={selectedEmailId}
              onSelectEmail={setSelectedEmailId}
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
