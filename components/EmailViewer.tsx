"use client"

import { useState } from "react"
import { EmailData, extractDisplayName, extractEmailAddress } from "@/lib/email-utils"
import AISummary from "./AISummary"
import ReplyDraft from "./ReplyDraft"
import { ArrowLeft, Star, Archive, Trash2, Reply, Forward, RotateCcw } from "lucide-react"

interface EmailViewerProps {
  email: EmailData
  onBack: () => void
  onReply: () => void
  onDelete: () => void
  onRestore: () => void
}

export default function EmailViewer({ email, onBack, onReply, onDelete, onRestore }: EmailViewerProps) {
  const [showAISummary, setShowAISummary] = useState(false)
  const [showReplyDraft, setShowReplyDraft] = useState(false)

  const date = new Date(email.date)

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              <Archive className="w-4 h-4" />
            </button>
            {!email.isDeleted ? (
              <button onClick={onDelete} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Delete email">
              <Trash2 className="w-4 h-4" />
            </button>
            ) : (
              <button onClick={onRestore} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Restore email">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              <Star className={`w-4 h-4 ${email.isStarred ? "text-yellow-400 fill-yellow-400" : ""}`} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAISummary(!showAISummary)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showAISummary
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            ✨ AI Summary
          </button>
          <button
            onClick={() => setShowReplyDraft(!showReplyDraft)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showReplyDraft
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            🤖 Draft Reply
          </button>
        </div>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          {/* Subject */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{email.subject}</h1>

          {/* Sender info */}
          <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {extractDisplayName(email.from)[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{extractDisplayName(email.from)}</p>
                <p className="text-sm text-gray-500">{extractEmailAddress(email.from)}</p>
                <p className="text-xs text-gray-400">To: {email.to}</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-400 flex-shrink-0">
              <p>{date.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
              <p>{date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>

          {/* AI Summary Panel */}
          {showAISummary && (
            <AISummary
              emailId={email.id}
              localAIMode="heuristic"
              onClose={() => setShowAISummary(false)}
            />
          )}

          {/* AI Reply Draft */}
          {showReplyDraft && (
            <ReplyDraft
              emailId={email.id}
              onInsert={onReply}
              localAIMode="heuristic"
              onClose={() => setShowReplyDraft(false)}
            />
          )}

          {/* Email body */}
          <div className="prose prose-sm max-w-none">
            {email.bodyHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                className="text-gray-700 leading-relaxed"
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
                {email.bodyText}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Reply bar */}
      <div className="border-t border-gray-200 p-4 flex gap-2 flex-shrink-0">
        <button
          onClick={onReply}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Reply className="w-4 h-4" />
          Reply
        </button>
        <button
          onClick={onReply}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          <Forward className="w-4 h-4" />
          Forward
        </button>
      </div>
    </div>
  )
}
