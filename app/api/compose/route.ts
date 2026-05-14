import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json()
  const { to, subject, content } = body

  if (!to || !subject || !content) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const messageId = `msg_${Date.now()}`
  
  return NextResponse.json({
    success: true,
    messageId,
    message: "Email sent successfully (demo mode)",
  })
}
