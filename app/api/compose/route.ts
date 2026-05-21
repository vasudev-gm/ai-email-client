import { NextResponse } from "next/server"
import { MOCK_EMAILS } from "@/lib/email-utils"
import { auth } from "@/lib/auth"
import { sendGmailEmail } from "@/lib/gmail"
import { sendOutlookEmail } from "@/lib/outlook"

export async function POST(request: Request) {
  const body = await request.json()
  const { to, cc, bcc, subject, content } = body

  if (!to || !subject || !content) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const session = await auth()
  if (session?.provider === "google" && session.accessToken) {
    try {
      const result = await sendGmailEmail(
        { accessToken: session.accessToken },
        {
          to,
          cc,
          bcc,
          subject,
          body: content,
        }
      )

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: "Email sent successfully via Gmail",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error"
      return NextResponse.json({ error: `Gmail send failed: ${message}` }, { status: 502 })
    }
  }

  if (session?.provider === "microsoft-entra-id" && session.accessToken) {
    try {
      const result = await sendOutlookEmail(
        { accessToken: session.accessToken },
        {
          to,
          cc,
          bcc,
          subject,
          body: content,
        }
      )

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: "Email sent successfully via Outlook",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error"
      return NextResponse.json({ error: `Outlook send failed: ${message}` }, { status: 502 })
    }
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
