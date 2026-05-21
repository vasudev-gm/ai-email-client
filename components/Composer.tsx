"use client"

import { useEffect, useState } from "react"
import { X, Wand2, Send } from "lucide-react"
import { useEmailStore } from "@/store/emailStore"

interface ComposerProps {
  isOpen: boolean
  onClose: () => void
  onSend: (data: {
    to: string
    cc?: string
    bcc?: string
    subject: string
    content: string
  }) => Promise<void>
  replyTo?: {
    to: string
    subject: string
  }
  draft?: {
    to?: string
    cc?: string
    bcc?: string
    subject?: string
    content?: string
  }
}

export default function Composer({ isOpen, onClose, onSend, replyTo, draft }: ComposerProps) {
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [showCc, setShowCc] = useState(false)
  const [sending, setSending] = useState(false)
  const [assisting, setAssisting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { localAIMode = "heuristic" } = useEmailStore()

  useEffect(() => {
    if (!isOpen) return

    const initialTo = draft?.to ?? replyTo?.to ?? ""
    const initialSubject = draft?.subject ?? (replyTo ? `Re: ${replyTo.subject}` : "")
    const initialCc = draft?.cc ?? ""
    const initialBcc = draft?.bcc ?? ""
    const initialContent = draft?.content ?? ""

    setTo(initialTo)
    setCc(initialCc)
    setBcc(initialBcc)
    setSubject(initialSubject)
    setContent(initialContent)
    setShowCc(Boolean(initialCc || initialBcc))
    setError(null)
  }, [isOpen, draft, replyTo])

  if (!isOpen) return null

  const isValidEmailList = (input: string) => {
    if (!input.trim()) return true
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return input
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .every((value) => emailRegex.test(value))
  }

  const handleSend = async () => {
    setError(null)
    if (!to.trim() || !subject.trim() || !content.trim()) return
    if (!isValidEmailList(to) || !isValidEmailList(cc) || !isValidEmailList(bcc)) {
      setError("Please enter valid email addresses separated by commas.")
      return
    }
    setSending(true)
    await onSend({
      to: to.trim(),
      cc: cc.trim() || undefined,
      bcc: bcc.trim() || undefined,
      subject: subject.trim(),
      content: content.trim(),
    })
    setSending(false)
    setTo("")
    setCc("")
    setBcc("")
    setSubject("")
    setContent("")
  }

  const handleAIAssist = async () => {
    setError(null)
    if (!subject.trim() && !content.trim()) {
      setError("Add a subject or message first for AI Assist.")
      return
    }

    setAssisting(true)
    try {
      const response = await fetch("/api/compose/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          content,
          localAIMode,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data?.draft) {
        throw new Error("AI draft generation failed")
      }
      setContent(data.draft)
    } catch {
      setError("AI Assist couldn't generate a draft. Please try again.")
    } finally {
      setAssisting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col border border-transparent dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">New Message</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-0">
            <div className="flex items-center border-b border-gray-200 dark:border-gray-700 py-2">
              <label className="text-sm text-gray-500 dark:text-gray-400 w-14 flex-shrink-0">To</label>
              <input
                type="text"
                placeholder="recipient@example.com, team@example.com"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="flex-1 text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500"
              />
              <button
                onClick={() => setShowCc(!showCc)}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-2"
              >
                Cc/Bcc
              </button>
            </div>

            {showCc && (
              <>
                <div className="flex items-center border-b border-gray-200 dark:border-gray-700 py-2">
                  <label className="text-sm text-gray-500 dark:text-gray-400 w-14 flex-shrink-0">Cc</label>
                  <input
                    type="text"
                    placeholder="cc@example.com, team@example.com"
                    value={cc}
                    onChange={e => setCc(e.target.value)}
                    className="flex-1 text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div className="flex items-center border-b border-gray-200 dark:border-gray-700 py-2">
                  <label className="text-sm text-gray-500 dark:text-gray-400 w-14 flex-shrink-0">Bcc</label>
                  <input
                    type="text"
                    placeholder="bcc@example.com, team@example.com"
                    value={bcc}
                    onChange={e => setBcc(e.target.value)}
                    className="flex-1 text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </>
            )}

            <div className="flex items-center border-b border-gray-200 dark:border-gray-700 py-2">
              <label className="text-sm text-gray-500 dark:text-gray-400 w-14 flex-shrink-0">Subject</label>
              <input
                type="text"
                placeholder="Email subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="flex-1 text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <textarea
              placeholder="Write your message..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500 min-h-48 pt-3 resize-none"
            />
            {error && <p className="text-xs text-red-600 pt-2">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleAIAssist}
            disabled={assisting}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors disabled:opacity-50"
          >
            <Wand2 className="w-4 h-4" />
            {assisting ? "Assisting..." : "AI Assist"}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!to || !subject || !content || sending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
