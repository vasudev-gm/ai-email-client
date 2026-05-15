"use client"

import { useState, useEffect, useCallback } from "react"
import { Sparkles, RefreshCw } from "lucide-react"

interface AISummaryProps {
  emailId: string
  localAIMode: "heuristic" | "true-slm"
}

export default function AISummary({ emailId, localAIMode }: AISummaryProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const fetchSummary = useCallback(async () => {
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
        body: JSON.stringify({ action: "summarize", localAIMode }),
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
      if (statusInterval) clearInterval(statusInterval)
      if (localAIMode === "true-slm") setDownloadProgress(100)
      setLoading(false)
    }
  }, [emailId, localAIMode])

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
          {localAIMode === "true-slm" && (
            <>
              <p className="text-xs text-purple-700">Downloading true local model… {downloadProgress}%</p>
              <div className="h-2 bg-purple-200 rounded overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
              </div>
            </>
          )}
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
