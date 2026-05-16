import { NextResponse } from "next/server"
import { generateReplyDraftWithOptions } from "@/lib/ai"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Malformed JSON request body" }, { status: 400 })
  }
  const payload = (body && typeof body === "object" ? body : {}) as Record<string, unknown>
  const subject = typeof payload.subject === "string" ? payload.subject.trim() : ""
  const content = typeof payload.content === "string" ? payload.content.trim() : ""
  const to = typeof payload.to === "string" ? payload.to.trim() : ""
  const localAIMode = payload.localAIMode === "true-slm" ? "true-slm" : "heuristic"

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
