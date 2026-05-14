import { NextResponse } from "next/server"
import { MOCK_EMAILS } from "@/lib/email-utils"
import { summarizeEmail, generateReplyDraft, prioritizeEmail } from "@/lib/ai"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { action } = await request.json()
  const email = MOCK_EMAILS.find(e => e.id === id)
  
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 })
  }

  const body = email.bodyText || email.bodyHtml || ""

  try {
    if (action === "summarize") {
      const summary = await summarizeEmail(email.subject, body)
      return NextResponse.json({ summary })
    } else if (action === "draft") {
      const draft = await generateReplyDraft(email.subject, body, email.from)
      return NextResponse.json({ draft })
    } else if (action === "prioritize") {
      const priority = await prioritizeEmail(email.subject, body, email.from)
      return NextResponse.json({ priority })
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "AI service error" }, { status: 500 })
  }
}
