import { NextResponse } from "next/server"
import { MOCK_EMAILS } from "@/lib/email-utils"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  void request
  const { id } = await params
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

  return NextResponse.json({ success: true, email })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  void request
  const { id } = await params
  const email = MOCK_EMAILS.find(e => e.id === id)
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 })
  }
  email.isDeleted = true
  return NextResponse.json({ success: true })
}
