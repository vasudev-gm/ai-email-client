import Anthropic from "@anthropic-ai/sdk"

const client = process.env.ANTHROPIC_API_KEY 
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

export async function summarizeEmail(subject: string, body: string): Promise<string> {
  if (!client) {
    return "AI summary not available. Set ANTHROPIC_API_KEY to enable."
  }
  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 150,
    messages: [{
      role: "user",
      content: `Summarize this email in 2-3 sentences:\nSubject: ${subject}\n\n${body}`
    }]
  })
  const content = message.content[0]
  return content.type === "text" ? content.text : ""
}

export async function generateReplyDraft(subject: string, body: string, senderName: string): Promise<string> {
  if (!client) {
    return "Thank you for your email. I'll get back to you shortly."
  }
  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `Write a professional reply draft for this email:\nFrom: ${senderName}\nSubject: ${subject}\n\n${body}\n\nWrite only the reply body, no subject line.`
    }]
  })
  const content = message.content[0]
  return content.type === "text" ? content.text : ""
}

export async function prioritizeEmail(subject: string, body: string, from: string): Promise<number> {
  if (!client) {
    return 3
  }
  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 10,
    messages: [{
      role: "user",
      content: `Rate the priority of this email from 1-5 (5=urgent). Reply with only a number.\nFrom: ${from}\nSubject: ${subject}\n\n${body.substring(0, 500)}`
    }]
  })
  const content = message.content[0]
  if (content.type === "text") {
    const num = parseInt(content.text.trim())
    return isNaN(num) ? 3 : Math.min(5, Math.max(1, num))
  }
  return 3
}
