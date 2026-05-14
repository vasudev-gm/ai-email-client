import { NextResponse } from "next/server"
import { MOCK_EMAILS } from "@/lib/email-utils"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const folder = searchParams.get("folder") || "INBOX"
  const search = searchParams.get("search") || ""

  let emails = MOCK_EMAILS

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

  return NextResponse.json({ emails, total: emails.length })
}
