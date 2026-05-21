import { NextResponse } from "next/server"
import { MOCK_EMAILS } from "@/lib/email-utils"
import { auth } from "@/lib/auth"
import { fetchGmailEmails, fetchGmailFolderCount, fetchGmailUnreadFolderCounts, GmailApiError } from "@/lib/gmail"
import { fetchOutlookEmails } from "@/lib/outlook"

const COUNT_FOLDERS = ["INBOX", "STARRED", "SENT", "DRAFTS", "ARCHIVED", "JUNK", "DELETED"] as const

function isGmailApiDisabledError(error: GmailApiError) {
  const message = (error.message || "").toLowerCase()
  const body = (error.responseBody || "").toLowerCase()
  return error.apiStatus === "PERMISSION_DENIED" && (
    message.includes("gmail api has not been used") ||
    message.includes("is disabled") ||
    body.includes("gmail.googleapis.com/overview")
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const folder = searchParams.get("folder") || "INBOX"
  const search = searchParams.get("search") || ""
  const countOnly = searchParams.get("countOnly") === "1"
  const unreadOnly = searchParams.get("unreadOnly") === "1"
  const accountId = searchParams.get("accountId") || ""

  const session = await auth()
  const isGoogleSession = session?.provider === "google" && Boolean(session.accessToken)
  const isMicrosoftSession = session?.provider === "microsoft-entra-id" && Boolean(session.accessToken)

  if (isGoogleSession) {
    if (session.error === "MissingRefreshToken") {
      return NextResponse.json(
        {
          error: "Google session expired and no refresh token is available. Please sign out and sign in with Google again.",
          source: "gmail",
          code: "MissingRefreshToken",
          reauthRequired: true,
        },
        { status: 401 }
      )
    }

    if (session.error === "RefreshAccessTokenError") {
      return NextResponse.json(
        {
          error: "Google token refresh failed. Please sign out and sign in with Google again.",
          source: "gmail",
          code: "RefreshAccessTokenError",
          reauthRequired: true,
        },
        { status: 401 }
      )
    }

    try {
      if (countOnly && unreadOnly && folder.toUpperCase() === "ALL") {
        const folderCounts = await fetchGmailUnreadFolderCounts({ accessToken: session.accessToken as string })
        return NextResponse.json({
          emails: [],
          total: folderCounts.INBOX,
          inboxUnreadCount: folderCounts.INBOX,
          folderCounts,
          source: "gmail",
        })
      }

      if (countOnly && !search) {
        const total = await fetchGmailFolderCount(
          { accessToken: session.accessToken as string },
          folder,
          { unreadOnly }
        )
        return NextResponse.json({ emails: [], total, source: "gmail" })
      }

      let emails = await fetchGmailEmails({ accessToken: session.accessToken as string }, folder)

      if (search) {
        const q = search.toLowerCase()
        emails = emails.filter((e) =>
          e.subject.toLowerCase().includes(q) ||
          e.from.toLowerCase().includes(q) ||
          (e.bodyText || "").toLowerCase().includes(q)
        )
      }

      return NextResponse.json({ emails, total: emails.length, source: "gmail" })
    } catch (error) {
      if (error instanceof GmailApiError) {
        const setupRequired = isGmailApiDisabledError(error)
        const reauthRequired = error.status === 401
        const status = reauthRequired ? 401 : error.status === 429 ? 429 : setupRequired ? 503 : 502
        return NextResponse.json(
          {
            error: `Gmail API error: ${error.message}`,
            source: "gmail",
            status: error.status,
            apiCode: error.apiCode,
            apiStatus: error.apiStatus,
            reauthRequired,
            setupRequired,
          },
          { status }
        )
      }

      const message = error instanceof Error ? error.message : "unknown error"
      return NextResponse.json(
        { error: `Gmail fetch failed: ${message}`, source: "gmail" },
        { status: 502 }
      )
    }
  }

  if (isMicrosoftSession) {
    try {
      if (countOnly && unreadOnly && folder.toUpperCase() === "ALL") {
        const folderPayloads = await Promise.allSettled(
          COUNT_FOLDERS.map(async (folderId) => {
            const list = await fetchOutlookEmails({ accessToken: session.accessToken as string }, folderId)
            return [folderId, list.filter((email) => !email.isRead).length] as const
          })
        )
        const folderCounts = COUNT_FOLDERS.reduce((acc, folderId, index) => {
          const result = folderPayloads[index]
          if (result.status === "fulfilled") {
            acc[folderId] = result.value[1]
          } else {
            // Keep sync resilient when one Graph folder endpoint is flaky.
            acc[folderId] = 0
          }
          return acc
        }, {} as Record<(typeof COUNT_FOLDERS)[number], number>)
        return NextResponse.json({
          emails: [],
          total: folderCounts.INBOX,
          inboxUnreadCount: folderCounts.INBOX,
          folderCounts,
          source: "outlook",
        })
      }

      let emails: Awaited<ReturnType<typeof fetchOutlookEmails>>
      try {
        emails = await fetchOutlookEmails({ accessToken: session.accessToken as string }, folder)
      } catch (folderError) {
        const normalizedFolder = folder.toUpperCase()
        if (normalizedFolder === "STARRED" || normalizedFolder === "JUNK") {
          emails = []
        } else {
          throw folderError
        }
      }

      if (unreadOnly) {
        emails = emails.filter((e) => !e.isRead)
      }

      if (search) {
        const q = search.toLowerCase()
        emails = emails.filter((e) =>
          e.subject.toLowerCase().includes(q) ||
          e.from.toLowerCase().includes(q) ||
          (e.bodyText || "").toLowerCase().includes(q)
        )
      }

      if (countOnly) {
        return NextResponse.json({ emails: [], total: emails.length, source: "outlook" })
      }

      return NextResponse.json({ emails, total: emails.length, source: "outlook" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error"
      return NextResponse.json(
        { error: `Outlook fetch failed: ${message}`, source: "outlook" },
        { status: 502 }
      )
    }
  }

  let emails = MOCK_EMAILS

  if (accountId) {
    emails = emails.filter((email) => email.accountId === accountId)
  }

  if (countOnly && unreadOnly && folder.toUpperCase() === "ALL") {
    const folderFiltered = {
      INBOX: emails.filter((e) => !e.isSent && !e.isDraft && !e.isArchived && !e.isDeleted),
      STARRED: emails.filter((e) => e.isStarred && !e.isDeleted),
      SENT: emails.filter((e) => e.isSent && !e.isDeleted),
      DRAFTS: emails.filter((e) => e.isDraft && !e.isDeleted),
      ARCHIVED: emails.filter((e) => e.isArchived && !e.isDeleted),
      JUNK: emails.filter((e) => e.folder === "JUNK" && !e.isDeleted),
      DELETED: emails.filter((e) => e.isDeleted),
    }

    const folderCounts = {
      INBOX: folderFiltered.INBOX.filter((e) => !e.isRead).length,
      STARRED: folderFiltered.STARRED.filter((e) => !e.isRead).length,
      SENT: folderFiltered.SENT.filter((e) => !e.isRead).length,
      DRAFTS: folderFiltered.DRAFTS.filter((e) => !e.isRead).length,
      ARCHIVED: folderFiltered.ARCHIVED.filter((e) => !e.isRead).length,
      JUNK: folderFiltered.JUNK.filter((e) => !e.isRead).length,
      DELETED: folderFiltered.DELETED.filter((e) => !e.isRead).length,
    }

    return NextResponse.json({
      emails: [],
      total: folderCounts.INBOX,
      inboxUnreadCount: folderCounts.INBOX,
      folderCounts,
    })
  }

  if (folder === "INBOX") {
    emails = emails.filter(e => !e.isSent && !e.isDraft && !e.isArchived && !e.isDeleted)
  } else if (folder === "SENT") {
    emails = emails.filter(e => e.isSent && !e.isDeleted)
  } else if (folder === "DRAFTS") {
    emails = emails.filter(e => e.isDraft && !e.isDeleted)
  } else if (folder === "ARCHIVED") {
    emails = emails.filter(e => e.isArchived && !e.isDeleted)
  } else if (folder === "JUNK") {
    emails = emails.filter(e => e.folder === "JUNK" && !e.isDeleted)
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

  if (unreadOnly) {
    emails = emails.filter((e) => !e.isRead)
  }

  emails = emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (countOnly) {
    return NextResponse.json({ emails: [], total: emails.length })
  }

  return NextResponse.json({ emails, total: emails.length })
}
