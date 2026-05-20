import { NextResponse } from "next/server"
import { MOCK_EMAILS } from "@/lib/email-utils"
import { auth } from "@/lib/auth"
import { deleteOutlookEmail, fetchOutlookEmailById, moveOutlookEmail, patchOutlookEmail } from "@/lib/outlook"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  void request
  const { id } = await params

  const session = await auth()
  if (session?.provider === "microsoft-entra-id" && session.accessToken) {
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
  const body = await request.json()

  const session = await auth()
  if (session?.provider === "microsoft-entra-id" && session.accessToken) {
    try {
      await patchOutlookEmail(
        { accessToken: session.accessToken },
        id,
        {
          isRead: typeof body.isRead === "boolean" ? body.isRead : undefined,
          isStarred: typeof body.isStarred === "boolean" ? body.isStarred : undefined,
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
        await deleteOutlookEmail({ accessToken: session.accessToken }, id)
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

  return NextResponse.json({ success: true, email })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  void request
  const { id } = await params

  const session = await auth()
  if (session?.provider === "microsoft-entra-id" && session.accessToken) {
    try {
      await deleteOutlookEmail({ accessToken: session.accessToken }, id)
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
  email.isDeleted = true
  return NextResponse.json({ success: true })
}
