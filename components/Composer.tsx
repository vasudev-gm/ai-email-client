"use client"

import { useState } from "react"
import { X, Wand2, Send } from "lucide-react"

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
}

export default function Composer({ isOpen, onClose, onSend, replyTo }: ComposerProps) {
  const [to, setTo] = useState(replyTo?.to || "")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : "")
  const [content, setContent] = useState("")
  const [showCc, setShowCc] = useState(false)
  const [sending, setSending] = useState(false)

  if (!isOpen) return null

  const handleSend = async () => {
    if (!to || !subject || !content) return
    setSending(true)
    await onSend({ to, cc: cc || undefined, bcc: bcc || undefined, subject, content })
    setSending(false)
    setTo("")
    setCc("")
    setBcc("")
    setSubject("")
    setContent("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">New Message</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-0">
            <div className="flex items-center border-b border-gray-200 py-2">
              <label className="text-sm text-gray-500 w-14 flex-shrink-0">To</label>
              <input
                type="email"
                placeholder="recipients@example.com"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="flex-1 text-sm outline-none placeholder-gray-400"
              />
              <button
                onClick={() => setShowCc(!showCc)}
                className="text-xs text-gray-400 hover:text-gray-600 ml-2"
              >
                Cc/Bcc
              </button>
            </div>

            {showCc && (
              <>
                <div className="flex items-center border-b border-gray-200 py-2">
                  <label className="text-sm text-gray-500 w-14 flex-shrink-0">Cc</label>
                  <input
                    type="email"
                    placeholder="cc@example.com"
                    value={cc}
                    onChange={e => setCc(e.target.value)}
                    className="flex-1 text-sm outline-none placeholder-gray-400"
                  />
                </div>
                <div className="flex items-center border-b border-gray-200 py-2">
                  <label className="text-sm text-gray-500 w-14 flex-shrink-0">Bcc</label>
                  <input
                    type="email"
                    placeholder="bcc@example.com"
                    value={bcc}
                    onChange={e => setBcc(e.target.value)}
                    className="flex-1 text-sm outline-none placeholder-gray-400"
                  />
                </div>
              </>
            )}

            <div className="flex items-center border-b border-gray-200 py-2">
              <label className="text-sm text-gray-500 w-14 flex-shrink-0">Subject</label>
              <input
                type="text"
                placeholder="Email subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="flex-1 text-sm outline-none placeholder-gray-400"
              />
            </div>

            <textarea
              placeholder="Write your message..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full text-sm outline-none placeholder-gray-400 min-h-48 pt-3 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
            <Wand2 className="w-4 h-4" />
            AI Assist
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
