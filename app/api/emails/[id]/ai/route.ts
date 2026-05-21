import { NextResponse } from "next/server"
import { MOCK_EMAILS } from "@/lib/email-utils"
import { auth } from "@/lib/auth"
import { fetchGmailEmailById } from "@/lib/gmail"
import { fetchOutlookEmailById } from "@/lib/outlook"
import {
  summarizeEmailWithOptions,
  generateReplyDraftWithOptions,
  prioritizeEmailWithOptions,
  getTrueSlmStatus,
  getAIDebugInfo,
} from "@/lib/ai"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { action, localAIMode, debug } = await request.json()
  const includeDebug = Boolean(debug)

  if (action === "modelStatus") {
    return NextResponse.json(getTrueSlmStatus())
  }

  const session = await auth()
  let email = null as (typeof MOCK_EMAILS)[number] | null

  if (session?.provider === "google" && session.accessToken) {
    try {
      email = await fetchGmailEmailById({ accessToken: session.accessToken }, id)
    } catch {
      email = null
    }
  } else if (session?.provider === "microsoft-entra-id" && session.accessToken) {
    try {
      email = await fetchOutlookEmailById({ accessToken: session.accessToken }, id)
    } catch {
      email = null
    }
  }

  if (!email) {
    email = MOCK_EMAILS.find((e) => e.id === id) || null
  }

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 })
  }

  const body = email.bodyText || email.bodyHtml || ""

  try {
    if (action === "summarize") {
      const summary = await summarizeEmailWithOptions(email.subject, body, { localMode: localAIMode })
      if (!includeDebug) return NextResponse.json({ summary })
      return NextResponse.json({ summary, aiDebug: await getAIDebugInfo({ localMode: localAIMode }) })
    } else if (action === "draft") {
      const draft = await generateReplyDraftWithOptions(email.subject, body, email.from, { localMode: localAIMode })
      if (!includeDebug) return NextResponse.json({ draft })
      return NextResponse.json({ draft, aiDebug: await getAIDebugInfo({ localMode: localAIMode }) })
    } else if (action === "prioritize") {
      const priority = await prioritizeEmailWithOptions(email.subject, body, email.from, { localMode: localAIMode })
      if (!includeDebug) return NextResponse.json({ priority })
      return NextResponse.json({ priority, aiDebug: await getAIDebugInfo({ localMode: localAIMode }) })
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "AI service error" }, { status: 500 })
  }
}
