"use client"

import { useState, useEffect, useCallback } from "react"
import { Wand2, RefreshCw, Copy, ArrowRight, X } from "lucide-react"

interface ReplyDraftProps {
  emailId: string
  onInsert: () => void
  localAIMode: "heuristic" | "true-slm"
  onClose: () => void
}

export default function ReplyDraft({ emailId, onInsert, localAIMode, onClose }: ReplyDraftProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const fetchDraft = useCallback(async () => {
    setLoading(true)
    setError(null)
    setDownloadProgress(0)

    let statusInterval: ReturnType<typeof setInterval> | undefined
    if (localAIMode === "true-slm") {
      statusInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/emails/${emailId}/ai`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "modelStatus", localAIMode }),
          })
          const statusData = await statusRes.json()
          if (typeof statusData.progress === "number") {
            setDownloadProgress(statusData.progress)
          }
        } catch {
          // ignore polling errors while generating
        }
      }, 500)
    }

    try {
      const res = await fetch(`/api/emails/${emailId}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft", localAIMode }),
      })
      const data = await res.json()
      if (data.draft) {
        setDraft(data.draft)
      } else {
        setError("Failed to generate draft")
      }
    } catch {
      setError("Network error")
    } finally {
      if (statusInterval) clearInterval(statusInterval)
      if (localAIMode === "true-slm") setDownloadProgress(100)
      setLoading(false)
    }
  }, [emailId, localAIMode])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDraft()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchDraft])

  const handleCopy = () => {
    if (draft) {
      navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
          <Wand2 className="w-4 h-4" />
          AI Reply Draft
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchDraft}
            disabled={loading}
            className="p-1 rounded hover:bg-blue-100 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${loading ? "animate-spin" : ""}`} />
          </button>
          {draft && (
            <>
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-blue-100 transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="w-3.5 h-3.5 text-blue-500" />
              </button>
              <button
                onClick={onInsert}
                className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
              >
                Use this
                <ArrowRight className="w-3 h-3" />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-blue-100 transition-colors"
            aria-label="Close draft"
          >
            <X className="w-3.5 h-3.5 text-blue-500" />
          </button>
        </div>
      </div>
      {loading && (
        <div className="space-y-2">
          {localAIMode === "true-slm" && (
            <>
              <p className="text-xs text-blue-700">Preparing private local AI… {downloadProgress}%</p>
              <div className="h-2 bg-blue-200 rounded overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
              </div>
            </>
          )}
          <div className="h-3 bg-blue-200 rounded animate-pulse" />
          <div className="h-3 bg-blue-200 rounded animate-pulse w-5/6" />
          <div className="h-3 bg-blue-200 rounded animate-pulse w-4/6" />
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {draft && !loading && (
        <div>
          {copied && <p className="text-xs text-green-600 mb-1">Copied to clipboard!</p>}
          <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">{draft}</p>
        </div>
      )}
    </div>
  )
}
