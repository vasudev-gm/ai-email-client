import { NextResponse } from "next/server"
import { MOCK_EMAILS } from "@/lib/email-utils"
import { auth } from "@/lib/auth"
import { deleteGmailEmail, fetchGmailEmailById, GmailApiError, patchGmailEmail, permanentlyDeleteGmailEmail } from "@/lib/gmail"
import { deleteOutlookEmail, fetchOutlookEmailById, moveOutlookEmail, patchOutlookEmail } from "@/lib/outlook"

function resolveTargetProvider(accountId: string | null) {
  if (!accountId) return null
  const normalized = accountId.trim().toLowerCase()
  if (!normalized) return null

  if (normalized === "gmail" || normalized.includes("google") || normalized.startsWith("oauth-google-")) {
    return "google" as const
  }
  if (normalized === "outlook" || normalized.includes("microsoft") || normalized.startsWith("oauth-microsoft-entra-id-")) {
    return "microsoft-entra-id" as const
  }
  return "local" as const
}

function normalizeMoveFolder(value: unknown) {
  if (typeof value !== "string") return undefined
  const normalized = value.trim().toUpperCase()
  return normalized || undefined
}

function parseLabels(value: unknown) {
  if (!Array.isArray(value)) return undefined
  const labels = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
  return labels.length > 0 ? labels : undefined
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get("accountId")
  const targetProvider = resolveTargetProvider(accountId)
  const { id } = await params

  const session = await auth()
  if (targetProvider && targetProvider !== "local" && session?.provider !== targetProvider) {
    return NextResponse.json(
      { error: "Selected email belongs to a different connected account. Switch account and try again." },
      { status: 409 }
    )
  }

  if (session?.provider === "google" && session.accessToken && targetProvider !== "microsoft-entra-id") {
    try {
      const email = await fetchGmailEmailById({ accessToken: session.accessToken }, id)
      return NextResponse.json(email)
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error"
      return NextResponse.json({ error: `Gmail email fetch failed: ${message}` }, { status: 502 })
    }
  }

  if (session?.provider === "microsoft-entra-id" && session.accessToken && targetProvider !== "google") {
    try {
      const email = await fetchOutlookEmailById({ accessToken: session.accessToken }, id)
      return NextResponse.json(email)
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error"
      return NextResponse.json({ error: `Outlook email fetch failed: ${message}` }, { status: 502 })
    }
  }

  const email = MOCK_EMAILS.find(e => e.id === id)
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 })
  }
  return NextResponse.json(email)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get("accountId")
  const targetProvider = resolveTargetProvider(accountId)
  const body = await request.json()
  const moveToFolder = normalizeMoveFolder(body.moveToFolder)
  const addLabels = parseLabels(body.addLabels)

  const session = await auth()
  if (targetProvider && targetProvider !== "local" && session?.provider !== targetProvider) {
    return NextResponse.json(
      { error: "Selected email belongs to a different connected account. Switch account and try again." },
      { status: 409 }
    )
  }

  if (session?.provider === "google" && session.accessToken && targetProvider !== "microsoft-entra-id") {
    try {
      await patchGmailEmail(
        { accessToken: session.accessToken },
        id,
        {
          isRead: typeof body.isRead === "boolean" ? body.isRead : undefined,
          isStarred: typeof body.isStarred === "boolean" ? body.isStarred : undefined,
          isArchived: typeof body.isArchived === "boolean" ? body.isArchived : undefined,
          isDeleted: typeof body.isDeleted === "boolean" ? body.isDeleted : undefined,
          isJunk: typeof body.isJunk === "boolean" ? body.isJunk : undefined,
          moveToFolder,
          addLabels,
        }
      )
      return NextResponse.json({ success: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error"
      return NextResponse.json({ error: `Gmail update failed: ${message}` }, { status: 502 })
    }
  }

  if (session?.provider === "microsoft-entra-id" && session.accessToken && targetProvider !== "google") {
    try {
      await patchOutlookEmail(
        { accessToken: session.accessToken },
        id,
        {
          isRead: typeof body.isRead === "boolean" ? body.isRead : undefined,
          isStarred: typeof body.isStarred === "boolean" ? body.isStarred : undefined,
          addLabels,
        }
      )
      if (typeof body.isArchived === "boolean" && body.isArchived) {
        await moveOutlookEmail({ accessToken: session.accessToken }, id, "archive")
      }
      if (typeof body.isArchived === "boolean" && !body.isArchived) {
        await moveOutlookEmail({ accessToken: session.accessToken }, id, "inbox")
      }
      if (typeof body.isDeleted === "boolean" && !body.isDeleted) {
        await moveOutlookEmail({ accessToken: session.accessToken }, id, "inbox")
      }
      if (typeof body.isDeleted === "boolean" && body.isDeleted) {
        await moveOutlookEmail({ accessToken: session.accessToken }, id, "deleteditems")
      }
      if (typeof body.isJunk === "boolean" && !body.isJunk) {
        await moveOutlookEmail({ accessToken: session.accessToken }, id, "inbox")
      }
      if (moveToFolder === "INBOX") {
        await moveOutlookEmail({ accessToken: session.accessToken }, id, "inbox")
      } else if (moveToFolder === "ARCHIVED") {
        await moveOutlookEmail({ accessToken: session.accessToken }, id, "archive")
      } else if (moveToFolder === "JUNK") {
        await moveOutlookEmail({ accessToken: session.accessToken }, id, "junkemail")
      } else if (moveToFolder === "DELETED") {
        await moveOutlookEmail({ accessToken: session.accessToken }, id, "deleteditems")
      } else if (moveToFolder === "SENT") {
        await moveOutlookEmail({ accessToken: session.accessToken }, id, "sentitems")
      } else if (moveToFolder === "DRAFTS") {
        await moveOutlookEmail({ accessToken: session.accessToken }, id, "drafts")
      } else if (moveToFolder === "STARRED") {
        await patchOutlookEmail({ accessToken: session.accessToken }, id, { isStarred: true })
      }
      return NextResponse.json({ success: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error"
      return NextResponse.json({ error: `Outlook update failed: ${message}` }, { status: 502 })
    }
  }

  const email = MOCK_EMAILS.find(e => e.id === id)
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 })
  }

  if (typeof body.isRead === "boolean") {
    email.isRead = body.isRead
  }
  if (typeof body.isStarred === "boolean") {
    email.isStarred = body.isStarred
  }
  if (typeof body.isArchived === "boolean") {
    email.isArchived = body.isArchived
  }
  if (typeof body.isDeleted === "boolean") {
    email.isDeleted = body.isDeleted
  }
  if (typeof body.isJunk === "boolean") {
    email.folder = body.isJunk ? "JUNK" : "INBOX"
    if (!body.isJunk) {
      email.isDeleted = false
      email.isArchived = false
    }
  }
  if (moveToFolder) {
    if (moveToFolder === "STARRED") {
      email.isStarred = true
    } else {
      email.folder = moveToFolder
      email.isArchived = moveToFolder === "ARCHIVED"
      email.isDeleted = moveToFolder === "DELETED"
      email.isSent = moveToFolder === "SENT"
      email.isDraft = moveToFolder === "DRAFTS"
    }
  }
  if (addLabels) {
    const existing = email.labels || []
    const existingById = new Map(existing.map((item) => [item.labelId, item]))
    for (const label of addLabels) {
      if (!existingById.has(label)) {
        existing.push({
          labelId: label,
          label: {
            name: label,
            color: "#0ea5e9",
          },
        })
      }
    }
    email.labels = existing
  }

  return NextResponse.json({ success: true, email })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get("accountId")
  const permanentDelete = searchParams.get("permanent") === "1"
  const targetProvider = resolveTargetProvider(accountId)
  const { id } = await params

  const session = await auth()
  if (targetProvider && targetProvider !== "local" && session?.provider !== targetProvider) {
    return NextResponse.json(
      { error: "Selected email belongs to a different connected account. Switch account and try again." },
      { status: 409 }
    )
  }

  if (session?.provider === "google" && session.accessToken && targetProvider !== "microsoft-entra-id") {
    try {
      if (permanentDelete) {
        await permanentlyDeleteGmailEmail({ accessToken: session.accessToken }, id)
      } else {
        await deleteGmailEmail({ accessToken: session.accessToken }, id)
      }
      return NextResponse.json({ success: true })
    } catch (error) {
      if (error instanceof GmailApiError) {
        if (permanentDelete && error.status === 404) {
          // Already permanently deleted in Gmail.
          return NextResponse.json({ success: true, alreadyDeleted: true })
        }

        const errorText = `${error.message} ${error.responseBody || ""}`.toLowerCase()
        const insufficientScopes =
          error.status === 403 &&
          (errorText.includes("insufficient authentication scopes") || error.apiStatus === "PERMISSION_DENIED")

        if (permanentDelete && insufficientScopes) {
          return NextResponse.json(
            {
              error: "Gmail permanent delete requires upgraded Google permissions. Please sign out and sign in with Google again to grant mail.google.com scope.",
              source: "gmail",
              status: error.status,
              apiCode: error.apiCode,
              apiStatus: error.apiStatus,
              reauthRequired: true,
              requiredScope: "https://mail.google.com/",
            },
            { status: 403 }
          )
        }

        const reauthRequired = error.status === 401 || error.status === 403
        const status = error.status === 429 ? 429 : reauthRequired ? error.status : 502
        return NextResponse.json(
          {
            error: `Gmail delete failed: ${error.message}`,
            source: "gmail",
            status: error.status,
            apiCode: error.apiCode,
            apiStatus: error.apiStatus,
            reauthRequired,
          },
          { status }
        )
      }

      const message = error instanceof Error ? error.message : "unknown error"
      return NextResponse.json({ error: `Gmail delete failed: ${message}` }, { status: 502 })
    }
  }

  if (session?.provider === "microsoft-entra-id" && session.accessToken && targetProvider !== "google") {
    try {
      if (permanentDelete) {
        await deleteOutlookEmail({ accessToken: session.accessToken }, id)
      } else {
        await moveOutlookEmail({ accessToken: session.accessToken }, id, "deleteditems")
      }
      return NextResponse.json({ success: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error"
      return NextResponse.json({ error: `Outlook delete failed: ${message}` }, { status: 502 })
    }
  }

  const email = MOCK_EMAILS.find(e => e.id === id)
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 })
  }

  if (permanentDelete) {
    const index = MOCK_EMAILS.findIndex((item) => item.id === id)
    if (index >= 0) {
      MOCK_EMAILS.splice(index, 1)
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: "Email not found" }, { status: 404 })
  }

  email.isDeleted = true
  return NextResponse.json({ success: true })
}
