import { NextResponse } from "next/server"
import { MOCK_EMAILS } from "@/lib/email-utils"
import {
  summarizeEmailWithOptions,
  generateReplyDraftWithOptions,
  prioritizeEmailWithOptions,
  getTrueSlmStatus,
} from "@/lib/ai"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { action, localAIMode } = await request.json()

  if (action === "modelStatus") {
    return NextResponse.json(getTrueSlmStatus())
  }

  const email = MOCK_EMAILS.find(e => e.id === id)
  
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 })
  }

  const body = email.bodyText || email.bodyHtml || ""

  try {
    if (action === "summarize") {
      const summary = await summarizeEmailWithOptions(email.subject, body, { localMode: localAIMode })
      return NextResponse.json({ summary })
    } else if (action === "draft") {
      const draft = await generateReplyDraftWithOptions(email.subject, body, email.from, { localMode: localAIMode })
      return NextResponse.json({ draft })
    } else if (action === "prioritize") {
      const priority = await prioritizeEmailWithOptions(email.subject, body, email.from, { localMode: localAIMode })
      return NextResponse.json({ priority })
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "AI service error" }, { status: 500 })
  }
}
