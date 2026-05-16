import { NextResponse } from "next/server"
import { generateReplyDraftWithOptions } from "@/lib/ai"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const subject = typeof body?.subject === "string" ? body.subject.trim() : ""
  const content = typeof body?.content === "string" ? body.content.trim() : ""
  const to = typeof body?.to === "string" ? body.to.trim() : ""
  const localAIMode = body?.localAIMode === "true-slm" ? "true-slm" : "heuristic"

  if (!subject && !content) {
    return NextResponse.json({ error: "Subject or content is required" }, { status: 400 })
  }

  const recipientEmail = to || "there"
  const draft = await generateReplyDraftWithOptions(
    subject || "Draft email",
    content || subject,
    recipientEmail,
    { localMode: localAIMode }
  )

  return NextResponse.json({ draft })
}
