import Anthropic from "@anthropic-ai/sdk"

// AI Provider types
type AIProvider = "anthropic" | "openai" | "local"

// Determine which AI provider to use based on available API keys
function getAIProvider(): AIProvider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic"
  if (process.env.OPENAI_API_KEY) return "openai"
  return "local"
}

// Initialize Anthropic client if API key is available
const anthropicClient = process.env.ANTHROPIC_API_KEY 
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

// OpenAI client initialization (lazy loaded, optional dependency)
let openaiClient: any = null
let openaiLoadAttempted = false

async function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null
  if (openaiClient) return openaiClient
  if (openaiLoadAttempted) return null
  
  openaiLoadAttempted = true
  
  try {
    // Try to dynamically import OpenAI - it's an optional dependency
    // Using Function constructor to bypass TypeScript's static import checking
    // This allows the app to build without the openai package installed
    // @ts-ignore - intentional use of Function constructor for optional dependency
    const importOpenAI = new Function('return import("openai")')
    const openaiModule = await importOpenAI().catch(() => null)
    
    if (!openaiModule) {
      console.warn("OpenAI SDK not installed. Install with: npm install openai")
      return null
    }
    
    const OpenAI = openaiModule.default || openaiModule.OpenAI
    if (!OpenAI) {
      console.warn("Could not load OpenAI constructor")
      return null
    }
    
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    return openaiClient
  } catch (error) {
    console.warn("Failed to initialize OpenAI client:", error)
    return null
  }
}

// Local SLM fallback using simple heuristics
const MIN_SENTENCE_LENGTH = 20

function localSummarize(subject: string, body: string): string {
  const sentences = body.split(/[.!?]+/).filter(s => s.trim().length > MIN_SENTENCE_LENGTH)
  const summary = sentences.slice(0, 2).join(". ").trim()
  return summary || `Email about: ${subject}`
}

function localReplyDraft(subject: string, body: string, senderName: string): string {
  const firstName = senderName.split(" ")[0]
  return `Hi ${firstName},\n\nThank you for your email regarding "${subject}". I've reviewed your message and will get back to you with a detailed response shortly.\n\nBest regards`
}

function localPrioritize(subject: string, body: string, _from: string): number {
  const urgentKeywords = ["urgent", "asap", "immediately", "critical", "emergency"]
  const importantKeywords = ["important", "deadline", "meeting", "action required"]
  
  const text = `${subject} ${body}`.toLowerCase()
  
  if (urgentKeywords.some(kw => text.includes(kw))) return 5
  if (importantKeywords.some(kw => text.includes(kw))) return 4
  if (text.includes("?")) return 3
  return 2
}

// Anthropic implementation
async function anthropicSummarize(subject: string, body: string): Promise<string> {
  if (!anthropicClient) throw new Error("Anthropic client not initialized")
  
  const message = await anthropicClient.messages.create({
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

async function anthropicReplyDraft(subject: string, body: string, senderName: string): Promise<string> {
  if (!anthropicClient) throw new Error("Anthropic client not initialized")
  
  const message = await anthropicClient.messages.create({
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

async function anthropicPrioritize(subject: string, body: string, from: string): Promise<number> {
  if (!anthropicClient) throw new Error("Anthropic client not initialized")
  
  const message = await anthropicClient.messages.create({
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

// OpenAI implementation
async function openaiSummarize(subject: string, body: string): Promise<string> {
  const client = await getOpenAIClient()
  if (!client) {
    console.warn("OpenAI client not available, falling back to local")
    return localSummarize(subject, body)
  }
  
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    max_tokens: 150,
    messages: [{
      role: "user",
      content: `Summarize this email in 2-3 sentences:\nSubject: ${subject}\n\n${body}`
    }]
  })
  return completion.choices[0]?.message?.content || ""
}

async function openaiReplyDraft(subject: string, body: string, senderName: string): Promise<string> {
  const client = await getOpenAIClient()
  if (!client) {
    console.warn("OpenAI client not available, falling back to local")
    return localReplyDraft(subject, body, senderName)
  }
  
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `Write a professional reply draft for this email:\nFrom: ${senderName}\nSubject: ${subject}\n\n${body}\n\nWrite only the reply body, no subject line.`
    }]
  })
  return completion.choices[0]?.message?.content || ""
}

async function openaiPrioritize(subject: string, body: string, from: string): Promise<number> {
  const client = await getOpenAIClient()
  if (!client) {
    console.warn("OpenAI client not available, falling back to local")
    return localPrioritize(subject, body, from)
  }
  
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    max_tokens: 10,
    messages: [{
      role: "user",
      content: `Rate the priority of this email from 1-5 (5=urgent). Reply with only a number.\nFrom: ${from}\nSubject: ${subject}\n\n${body.substring(0, 500)}`
    }]
  })
  const text = completion.choices[0]?.message?.content || "3"
  const num = parseInt(text.trim())
  return isNaN(num) ? 3 : Math.min(5, Math.max(1, num))
}

// Public API - automatically routes to the appropriate provider
export async function summarizeEmail(subject: string, body: string): Promise<string> {
  const provider = getAIProvider()
  
  try {
    switch (provider) {
      case "anthropic":
        return await anthropicSummarize(subject, body)
      case "openai":
        return await openaiSummarize(subject, body)
      case "local":
        return localSummarize(subject, body)
    }
  } catch (error) {
    console.error(`AI summarize error (${provider}):`, error)
    return localSummarize(subject, body)
  }
}

export async function generateReplyDraft(subject: string, body: string, senderName: string): Promise<string> {
  const provider = getAIProvider()
  
  try {
    switch (provider) {
      case "anthropic":
        return await anthropicReplyDraft(subject, body, senderName)
      case "openai":
        return await openaiReplyDraft(subject, body, senderName)
      case "local":
        return localReplyDraft(subject, body, senderName)
    }
  } catch (error) {
    console.error(`AI reply draft error (${provider}):`, error)
    return localReplyDraft(subject, body, senderName)
  }
}

export async function prioritizeEmail(subject: string, body: string, from: string): Promise<number> {
  const provider = getAIProvider()
  
  try {
    switch (provider) {
      case "anthropic":
        return await anthropicPrioritize(subject, body, from)
      case "openai":
        return await openaiPrioritize(subject, body, from)
      case "local":
        return localPrioritize(subject, body, from)
    }
  } catch (error) {
    console.error(`AI prioritize error (${provider}):`, error)
    return localPrioritize(subject, body, from)
  }
}
