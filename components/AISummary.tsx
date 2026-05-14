"use client"

import { useState, useEffect, useCallback } from "react"
import { Sparkles, RefreshCw } from "lucide-react"

interface AISummaryProps {
  emailId: string
}

export default function AISummary({ emailId }: AISummaryProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/emails/${emailId}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "summarize" }),
      })
      const data = await res.json()
      if (data.summary) {
        setSummary(data.summary)
      } else {
        setError("Failed to generate summary")
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }, [emailId])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return (
    <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-purple-700 font-medium text-sm">
          <Sparkles className="w-4 h-4" />
          AI Summary
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="p-1 rounded hover:bg-purple-100 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-purple-500 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      {loading && (
        <div className="space-y-2">
          <div className="h-3 bg-purple-200 rounded animate-pulse" />
          <div className="h-3 bg-purple-200 rounded animate-pulse w-4/5" />
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {summary && !loading && (
        <p className="text-sm text-purple-800 leading-relaxed">{summary}</p>
      )}
    </div>
  )
}
