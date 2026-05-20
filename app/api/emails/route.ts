import { NextResponse } from "next/server"
import { MOCK_EMAILS } from "@/lib/email-utils"
import { auth } from "@/lib/auth"
import { fetchOutlookEmails } from "@/lib/outlook"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const folder = searchParams.get("folder") || "INBOX"
  const search = searchParams.get("search") || ""
  const accountId = searchParams.get("accountId") || ""

  const session = await auth()
  const isMicrosoftSession = session?.provider === "microsoft-entra-id" && Boolean(session.accessToken)

  if (isMicrosoftSession) {
    try {
      let emails = await fetchOutlookEmails({ accessToken: session.accessToken as string }, folder)

      if (search) {
        const q = search.toLowerCase()
        emails = emails.filter((e) =>
          e.subject.toLowerCase().includes(q) ||
          e.from.toLowerCase().includes(q) ||
          (e.bodyText || "").toLowerCase().includes(q)
        )
      }

      return NextResponse.json({ emails, total: emails.length, source: "outlook" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error"
      console.warn("Outlook email fetch failed; falling back to mock emails", { message })
    }
  }

  let emails = MOCK_EMAILS

  if (accountId) {
    emails = emails.filter((email) => email.accountId === accountId)
  }

  if (folder === "INBOX") {
    emails = emails.filter(e => !e.isSent && !e.isDraft && !e.isArchived && !e.isDeleted)
  } else if (folder === "SENT") {
    emails = emails.filter(e => e.isSent && !e.isDeleted)
  } else if (folder === "DRAFTS") {
    emails = emails.filter(e => e.isDraft && !e.isDeleted)
  } else if (folder === "ARCHIVED") {
    emails = emails.filter(e => e.isArchived && !e.isDeleted)
  } else if (folder === "STARRED") {
    emails = emails.filter(e => e.isStarred && !e.isDeleted)
  } else if (folder === "DELETED") {
    emails = emails.filter(e => e.isDeleted)
  } else {
    emails = emails.filter((email) => !email.isDeleted)
  }

  if (search) {
    const q = search.toLowerCase()
    emails = emails.filter(e =>
      e.subject.toLowerCase().includes(q) ||
      e.from.toLowerCase().includes(q) ||
      (e.bodyText || "").toLowerCase().includes(q)
    )
  }

  emails = emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return NextResponse.json({ emails, total: emails.length })
}
