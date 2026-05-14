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
  return NextResponse.json({ success: true, id, ...body })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  void request
  void params
  return NextResponse.json({ success: true })
}
