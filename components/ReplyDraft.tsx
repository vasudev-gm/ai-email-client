"use client"

import { useState, useEffect, useCallback } from "react"
import { Wand2, RefreshCw, Copy, ArrowRight } from "lucide-react"

interface ReplyDraftProps {
  emailId: string
  onInsert: () => void
}

export default function ReplyDraft({ emailId, onInsert }: ReplyDraftProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchDraft = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/emails/${emailId}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft" }),
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
      setLoading(false)
    }
  }, [emailId])

  useEffect(() => {
    fetchDraft()
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
        </div>
      </div>
      {loading && (
        <div className="space-y-2">
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
