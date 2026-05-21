"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { EmailData, extractDisplayName, extractEmailAddress } from "@/lib/email-utils"
import AISummary from "./AISummary"
import ReplyDraft from "./ReplyDraft"
import { ArrowLeft, Star, Archive, Trash2, Reply, Forward, RotateCcw, ShieldCheck } from "lucide-react"

const MOVE_TARGETS = ["INBOX", "STARRED", "SENT", "DRAFTS", "ARCHIVED", "JUNK", "DELETED"] as const
const COMMON_LABEL_OPTIONS = ["Work", "Personal", "Important"] as const

interface EmailViewerProps {
  email: EmailData
  onBack: () => void
  onReply: () => void
  onForward: () => void
  onDelete: () => void
  onRestore: () => void
  onNotSpam: () => void
  onMoveToFolder: (folder: string) => void
  onAddLabel: (label: string) => void
  existingLabels?: string[]
}

export default function EmailViewer({ email, onBack, onReply, onForward, onDelete, onRestore, onNotSpam, onMoveToFolder, onAddLabel, existingLabels = [] }: EmailViewerProps) {
  const [showAISummary, setShowAISummary] = useState(false)
  const [showReplyDraft, setShowReplyDraft] = useState(false)
  const [moveTarget, setMoveTarget] = useState(email.folder || "INBOX")
  const [selectedExistingLabel, setSelectedExistingLabel] = useState("")
  const moveTargetRef = useRef<HTMLSelectElement | null>(null)
  const existingLabelRef = useRef<HTMLSelectElement | null>(null)

  const date = new Date(email.date)
  const availableMoveTargets = useMemo(
    () => MOVE_TARGETS.filter((target) => target !== (email.folder || "").toUpperCase()),
    [email.folder]
  )
  const existingLabelOptions = useMemo(
    () => Array.from(
      new Set([
        ...COMMON_LABEL_OPTIONS,
        ...existingLabels,
        ...(email.labels || []).map((item) => item.label.name),
      ].map((label) => label.trim()).filter(Boolean))
    ),
    [existingLabels, email.labels]
  )

  useEffect(() => {
    setMoveTarget(availableMoveTargets[0] || "INBOX")
    setSelectedExistingLabel("")
  }, [email.id, email.folder, availableMoveTargets])

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1">
            <button
              title="Archive"
              aria-label="Archive email"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            >
              <Archive className="w-4 h-4" />
            </button>
            {!email.isDeleted ? (
               <button
                onClick={onDelete}
                title="Delete"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                aria-label="Delete email"
              >
              <Trash2 className="w-4 h-4" />
            </button>
            ) : (
               <button
                onClick={onRestore}
                title="Restore"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                aria-label="Restore email"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            {email.folder === "JUNK" && (
              <button
                onClick={onNotSpam}
                title="Mark as not spam"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                aria-label="Mark as not spam"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}
            <button
              title={email.isStarred ? "Unstar" : "Star"}
              aria-label={email.isStarred ? "Unstar email" : "Star email"}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            >
              <Star className={`w-4 h-4 ${email.isStarred ? "text-yellow-400 fill-yellow-400" : ""}`} />
            </button>
          </div>
          <div className="hidden md:flex items-center gap-1 ml-2">
            <select
              ref={moveTargetRef}
              value={moveTarget}
              onChange={(event) => setMoveTarget(event.target.value)}
              className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
              aria-label="Move email to folder"
            >
              {availableMoveTargets.map((target) => (
                <option key={target} value={target}>{target}</option>
              ))}
            </select>
            <button
              onClick={() => onMoveToFolder(moveTargetRef.current?.value || moveTarget)}
              className="text-xs px-2 py-1 rounded bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300"
            >
              Move To
            </button>
            <select
              ref={existingLabelRef}
              value={selectedExistingLabel}
              onChange={(event) => setSelectedExistingLabel(event.target.value)}
              className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
              aria-label="Choose existing label"
            >
              <option value="">Existing labels</option>
              {existingLabelOptions.map((label) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
            <button
              onClick={() => {
                const trimmed = (existingLabelRef.current?.value || selectedExistingLabel).trim()
                if (!trimmed) return
                onAddLabel(trimmed)
                setSelectedExistingLabel("")
              }}
              disabled={!selectedExistingLabel}
              className="text-xs px-2 py-1 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 disabled:opacity-40"
            >
              Add Label
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAISummary(!showAISummary)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showAISummary
                ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            ✨ AI Summary
          </button>
          <button
            onClick={() => setShowReplyDraft(!showReplyDraft)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showReplyDraft
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{email.subject}</h1>

          {/* Sender info */}
          <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {extractDisplayName(email.from)[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{extractDisplayName(email.from)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-300">{extractEmailAddress(email.from)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-400">To: {email.to}</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-400 dark:text-gray-400 flex-shrink-0">
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

          {(email.blockedBlobImages || (email.blockedImageCount ?? 0) > 0) && (
            <div className="mb-3 text-[10px] leading-4 inline-flex items-center px-2 py-1 rounded border border-amber-300/60 bg-amber-50/90 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200">
              Some external images were blocked for performance/privacy
            </div>
          )}

          {/* Email body */}
          <div className="prose prose-sm max-w-none">
            {email.bodyHtml ? (
              <div className="email-html-surface dark:shadow-sm">
                <div
                  dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                  className="email-html text-gray-700 leading-relaxed"
                />
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-200 leading-relaxed">
                {email.bodyText}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Reply bar */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex gap-2 flex-shrink-0">
        <button
          onClick={onReply}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Reply className="w-4 h-4" />
          Reply
        </button>
        <button
          onClick={onForward}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          <Forward className="w-4 h-4" />
          Forward
        </button>
      </div>
    </div>
  )
}
