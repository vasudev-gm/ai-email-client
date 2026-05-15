import { NextResponse } from "next/server"
import { MOCK_EMAILS } from "@/lib/email-utils"

export async function POST(request: Request) {
  const body = await request.json()
  const { to, cc, bcc, subject, content } = body

  if (!to || !subject || !content) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const messageId = `msg_${Date.now()}`
  const emailId = String(MOCK_EMAILS.length + 1)
  const sentEmail = {
    id: emailId,
    accountId: "acc1",
    messageId,
    threadId: `thread_${messageId}`,
    from: "me@example.com",
    to,
    cc: cc || null,
    bcc: bcc || null,
    subject,
    bodyText: content,
    date: new Date(),
    isRead: true,
    isStarred: false,
    isArchived: false,
    isDeleted: false,
    isDraft: false,
    isSent: true,
    folder: "SENT",
    aiPriority: 2,
    labels: [],
  }
  MOCK_EMAILS.unshift(sentEmail)
  
  return NextResponse.json({
    success: true,
    messageId,
    emailId,
    message: "Email sent successfully (demo mode)",
  })
}
