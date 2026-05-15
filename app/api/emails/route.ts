import { NextResponse } from "next/server"
import { MOCK_EMAILS } from "@/lib/email-utils"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const folder = searchParams.get("folder") || "INBOX"
  const search = searchParams.get("search") || ""
  const accountId = searchParams.get("accountId") || ""

  let emails = MOCK_EMAILS.filter((email) => !email.isDeleted)

  if (accountId) {
    emails = emails.filter((email) => email.accountId === accountId)
  }

  if (folder === "INBOX") {
    emails = emails.filter(e => !e.isSent && !e.isDraft && !e.isArchived && !e.isDeleted)
  } else if (folder === "SENT") {
    emails = emails.filter(e => e.isSent)
  } else if (folder === "DRAFTS") {
    emails = emails.filter(e => e.isDraft)
  } else if (folder === "ARCHIVED") {
    emails = emails.filter(e => e.isArchived)
  } else if (folder === "STARRED") {
    emails = emails.filter(e => e.isStarred)
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
