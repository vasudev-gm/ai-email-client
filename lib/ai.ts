import Anthropic from "@anthropic-ai/sdk"

// AI Provider types
type AIProvider = "anthropic" | "openai" | "local"
export type LocalAIMode = "heuristic" | "true-slm"
type AIOptions = { localMode?: LocalAIMode }

export interface AIDebugInfo {
  selectedProvider: AIProvider
  effectiveProvider: AIProvider
  openaiModel: string
  hasAnthropicKey: boolean
  hasOpenAIKey: boolean
  openaiSdkReady: boolean
  localMode: LocalAIMode
  reason?: string
}

interface TrueSlmStatus {
  mode: LocalAIMode
  available: boolean
  ready: boolean
  progress: number
  message: string
}

// Determine which AI provider to use based on available API keys
function getAIProvider(): AIProvider {
  const providerOverride = (process.env.AI_PROVIDER || "").toLowerCase()

  if (providerOverride === "openai" && process.env.OPENAI_API_KEY) return "openai"
  if (providerOverride === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic"
  if (providerOverride === "local") return "local"

  // Default priority: OpenAI first, then Anthropic, then local fallback.
  if (process.env.OPENAI_API_KEY) return "openai"
  if (process.env.ANTHROPIC_API_KEY) return "anthropic"
  return "local"
}

// Initialize Anthropic client if API key is available
const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

// OpenAI client initialization (lazy loaded, optional dependency)
interface OpenAIChatCompletionClient {
  chat: {
    completions: {
      create: (input: {
        model: string
        max_tokens?: number
        max_completion_tokens?: number
        messages: Array<{ role: "user"; content: string }>
      }) => Promise<{ choices?: Array<{ message?: { content?: string | null } }> }>
    }
  }
  responses?: {
    create: (input: {
      model: string
      max_output_tokens?: number
      input: Array<{
        role: "user"
        content: Array<{ type: "input_text"; text: string }>
      }>
    }) => Promise<{
      output_text?: string
      output?: Array<{
        content?: Array<{ type?: string; text?: string }>
      }>
    }>
  }
}

function isUnsupportedTokenParamError(
  error: unknown,
  paramName: "max_tokens" | "max_completion_tokens"
): boolean {
  if (!error || typeof error !== "object") return false

  const openaiError = error as {
    code?: string
    param?: string
    error?: { code?: string; param?: string }
  }

  const code = openaiError.code || openaiError.error?.code
  const param = openaiError.param || openaiError.error?.param

  return code === "unsupported_parameter" && param === paramName
}

async function createOpenAICompletion(
  client: OpenAIChatCompletionClient,
  model: string,
  maxTokens: number,
  messages: Array<{ role: "user"; content: string }>
) {
  const basePayload = {
    model,
    messages,
  }

  try {
    return await client.chat.completions.create({
      ...basePayload,
      max_completion_tokens: maxTokens,
    })
  } catch (error) {
    if (!isUnsupportedTokenParamError(error, "max_completion_tokens")) {
      throw error
    }

    return client.chat.completions.create({
      ...basePayload,
      max_tokens: maxTokens,
    })
  }
}

function extractOpenAIResponseText(response: {
  output_text?: string
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
}): string {
  if (typeof response.output_text === "string" && response.output_text.trim().length > 0) {
    return response.output_text.trim()
  }

  const textParts: string[] = []
  for (const item of response.output || []) {
    for (const part of item.content || []) {
      if (part.type === "output_text" && typeof part.text === "string" && part.text.trim().length > 0) {
        textParts.push(part.text.trim())
      }
    }
  }

  return textParts.join("\n").trim()
}

async function createOpenAIText(
  client: OpenAIChatCompletionClient,
  model: string,
  maxTokens: number,
  prompt: string
): Promise<string> {
  try {
    const completion = await createOpenAICompletion(client, model, maxTokens, [{
      role: "user",
      content: prompt,
    }])
    return completion.choices?.[0]?.message?.content?.trim() || ""
  } catch (error) {
    const supportsResponsesApi = Boolean(client.responses?.create)
    if (!supportsResponsesApi) throw error

    const response = await client.responses!.create({
      model,
      max_output_tokens: maxTokens,
      input: [{
        role: "user",
        content: [{ type: "input_text", text: prompt }],
      }],
    })
    return extractOpenAIResponseText(response)
  }
}

let openaiClient: OpenAIChatCompletionClient | null = null
let openaiLoadAttempted = false

async function getOpenAIClient(): Promise<OpenAIChatCompletionClient | null> {
  if (!process.env.OPENAI_API_KEY) return null
  if (openaiClient) return openaiClient
  if (openaiLoadAttempted) return null

  openaiLoadAttempted = true

  try {
    // Try to dynamically import OpenAI - it's an optional dependency.
    // Using Function constructor to bypass TypeScript's static import checking.
    // This allows the app to build without the openai package installed.
    const importOpenAI = new Function('return import("openai")')
    const openaiModule = await (importOpenAI() as Promise<{ default?: unknown; OpenAI?: unknown }>).catch(() => null)

    if (!openaiModule) {
      console.warn("OpenAI SDK not installed. Install with: npm install openai")
      return null
    }

    const OpenAI = openaiModule.default || openaiModule.OpenAI
    if (!OpenAI) {
      console.warn("Could not load OpenAI constructor")
      return null
    }

    if (typeof OpenAI !== "function") {
      console.warn("OpenAI constructor is not a function")
      return null
    }

    const client = new (OpenAI as new (args: { apiKey?: string }) => OpenAIChatCompletionClient)({
      apiKey: process.env.OPENAI_API_KEY
    })
    openaiClient = client
    return openaiClient
  } catch (error) {
    console.warn("Failed to initialize OpenAI client:", error)
    return null
  }
}

// Local SLM fallback using simple heuristics
const MIN_SENTENCE_LENGTH = 20
const TRUE_SLM_MODEL = "Xenova/distilbart-cnn-6-6"
type TrueSlmPipeline = (
  prompt: string,
  options?: { max_new_tokens?: number }
) => Promise<Array<{ generated_text?: string }>>

let trueSlmPipeline: TrueSlmPipeline | null = null
let trueSlmLoadingPromise: Promise<TrueSlmPipeline | null> | null = null
let trueSlmStatus: TrueSlmStatus = {
  mode: "true-slm",
  available: true,
  ready: false,
  progress: 0,
  message: "Model not loaded",
}

function updateTrueSlmStatus(progress: number, message: string, updates?: Partial<TrueSlmStatus>) {
  trueSlmStatus = {
    ...trueSlmStatus,
    progress,
    message,
    ...updates,
  }
}

type TransformersModule = {
  pipeline: (
    task: "summarization" | "text2text-generation",
    model: string,
    options?: {
      progress_callback?: (event: { progress?: number }) => void
    }
  ) => Promise<(prompt: string, options?: { max_new_tokens?: number }) => Promise<Array<{ generated_text?: string; summary_text?: string }>>>
}

async function getTrueSlmPipeline() {
  if (trueSlmPipeline) return trueSlmPipeline
  if (trueSlmLoadingPromise) return trueSlmLoadingPromise

  trueSlmLoadingPromise = (async () => {
    updateTrueSlmStatus(5, "Initializing local model loader", { available: true, ready: false })
    try {
      const importTransformers = new Function('return import("@xenova/transformers")')
      const transformers = await (importTransformers() as Promise<TransformersModule>).catch(() => null)

      if (!transformers?.pipeline) {
        updateTrueSlmStatus(0, "Install @xenova/transformers to enable true SLM mode", { available: false, ready: false })
        return null
      }

      updateTrueSlmStatus(20, "Downloading local model")
      const pipeline = await transformers.pipeline("summarization", TRUE_SLM_MODEL, {
        progress_callback: (event) => {
          if (typeof event.progress === "number") {
            updateTrueSlmStatus(Math.max(20, Math.min(95, Math.round(event.progress * 100))), "Downloading local model")
          }
        },
      })

      trueSlmPipeline = async (prompt, options) => {
        const result = await pipeline(prompt, options)
        return result.map((item) => ({
          generated_text: item.generated_text || item.summary_text,
        }))
      }
      updateTrueSlmStatus(100, "Local model ready", { ready: true })
      return trueSlmPipeline
    } catch (error) {
      console.warn("Failed to initialize true local SLM pipeline:", error)
      updateTrueSlmStatus(0, "Failed to initialize true SLM. Using heuristic fallback.", { available: false, ready: false })
      return null
    } finally {
      trueSlmLoadingPromise = null
    }
  })()

  return trueSlmLoadingPromise
}

async function trueSlmSummarize(subject: string, body: string): Promise<string> {
  const pipeline = await getTrueSlmPipeline()
  if (!pipeline) return localSummarize(subject, body)
  const result = await pipeline(`${subject}\n\n${body}`, { max_new_tokens: 120 })
  return result[0]?.generated_text?.trim() || localSummarize(subject, body)
}

async function trueSlmReplyDraft(subject: string, body: string, senderName: string): Promise<string> {
  const pipeline = await getTrueSlmPipeline()
  if (!pipeline) return localReplyDraft(subject, body, senderName)
  const result = await pipeline(
    `Write a professional email reply.\nFrom: ${senderName}\nSubject: ${subject}\nMessage: ${body}`,
    { max_new_tokens: 180 }
  )
  return result[0]?.generated_text?.trim() || localReplyDraft(subject, body, senderName)
}

async function trueSlmPrioritize(subject: string, body: string, from: string): Promise<number> {
  const pipeline = await getTrueSlmPipeline()
  if (!pipeline) return localPrioritize(subject, body, from)
  const result = await pipeline(
    `Rate this email priority from 1 to 5 and output just one number.\nFrom: ${from}\nSubject: ${subject}\nBody: ${body}`,
    { max_new_tokens: 8 }
  )
  const num = Number.parseInt(result[0]?.generated_text?.trim() || "", 10)
  return Number.isNaN(num) ? localPrioritize(subject, body, from) : Math.min(5, Math.max(1, num))
}

function resolveLocalMode(options?: AIOptions): LocalAIMode {
  if (options?.localMode) return options.localMode
  return process.env.LOCAL_AI_MODE === "true-slm" ? "true-slm" : "heuristic"
}

function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim()
}

function splitSentences(input: string) {
  return input
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter((sentence) => sentence.length >= MIN_SENTENCE_LENGTH)
}

function sentenceScore(sentence: string, subject: string) {
  const text = sentence.toLowerCase()
  let score = 0

  if (/\b(urgent|asap|immediately|critical|deadline|action required)\b/.test(text)) score += 4
  if (/\b(please|kindly|could you|can you|need to|follow up|review|approve)\b/.test(text)) score += 3
  if (/\?|\bwhen\b|\bby\b|\bdue\b/.test(text)) score += 2
  if (/\d/.test(text)) score += 1
  if (subject && text.includes(subject.toLowerCase().slice(0, 20))) score += 1
  if (sentence.length > 180) score -= 1

  return score
}

function extractActionLines(body: string) {
  const sentences = splitSentences(body)
  const actions = sentences.filter((sentence) =>
    /\?|\b(please|kindly|could you|can you|need to|by\s+\w+|deadline|review|confirm|share|send|approve)\b/i.test(sentence)
  )
  return actions.slice(0, 2)
}

function detectUrgency(subject: string, body: string) {
  const text = `${subject} ${body}`.toLowerCase()
  return /\b(urgent|asap|immediately|critical|today|deadline|emergency)\b/.test(text)
}

function safeFirstName(senderName: string) {
  const firstToken = normalizeWhitespace(senderName).split(/[\s<@]/)[0] || "there"
  return firstToken.replace(/[^a-zA-Z0-9.'-]/g, "") || "there"
}

function localSummarize(subject: string, body: string): string {
  const normalizedBody = normalizeWhitespace(body)
  const sentences = splitSentences(normalizedBody)

  if (sentences.length === 0) {
    return normalizedBody || `Email about: ${subject}`
  }

  const ranked = sentences
    .map((sentence, index) => ({ sentence, index, score: sentenceScore(sentence, subject) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)

  return ranked.join(" ").trim()
}

function localReplyDraft(subject: string, body: string, senderName: string): string {
  const firstName = safeFirstName(senderName)
  const actions = extractActionLines(body)
  const urgent = detectUrgency(subject, body)

  const lines: string[] = [
    `Hi ${firstName},`,
    "",
    `Thanks for your email about "${subject}".`,
  ]

  if (actions.length > 0) {
    lines.push("I noted the following points:")
    for (const action of actions) {
      lines.push(`- ${action}`)
    }
    lines.push(urgent
      ? "I will prioritize this and follow up shortly with an update."
      : "I will review this and follow up with the requested details soon.")
  } else {
    lines.push(urgent
      ? "I understand this is time-sensitive and will prioritize a response."
      : "I will review the details and get back to you shortly.")
  }

  lines.push("", "Best regards")
  return lines.join("\n")
}

function localPrioritize(subject: string, body: string, from: string): number {
  const urgentKeywords = ["urgent", "asap", "immediately", "critical", "emergency"]
  const importantKeywords = ["important", "deadline", "meeting", "action required"]

  const text = `${subject} ${body} ${from}`.toLowerCase()

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

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini"
  const prompt = `Summarize this email in 2-3 sentences:\nSubject: ${subject}\n\n${body}`
  const text = await createOpenAIText(client, model, 250, prompt)
  return text || localSummarize(subject, body)
}

async function openaiReplyDraft(subject: string, body: string, senderName: string): Promise<string> {
  const client = await getOpenAIClient()
  if (!client) {
    console.warn("OpenAI client not available, falling back to local")
    return localReplyDraft(subject, body, senderName)
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini"
  const prompt = `Write a professional reply draft for this email:\nFrom: ${senderName}\nSubject: ${subject}\n\n${body}\n\nWrite only the reply body, no subject line.`
  const text = await createOpenAIText(client, model, 300, prompt)
  return text || localReplyDraft(subject, body, senderName)
}

async function openaiPrioritize(subject: string, body: string, from: string): Promise<number> {
  const client = await getOpenAIClient()
  if (!client) {
    console.warn("OpenAI client not available, falling back to local")
    return localPrioritize(subject, body, from)
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini"
  const prompt = `Rate the priority of this email from 1-5 (5=urgent). Reply with only a number.\nFrom: ${from}\nSubject: ${subject}\n\n${body.substring(0, 500)}`
  const text = await createOpenAIText(client, model, 10, prompt) || "3"
  const num = parseInt(text.trim())
  return isNaN(num) ? 3 : Math.min(5, Math.max(1, num))
}

// Public API - automatically routes to the appropriate provider
export async function summarizeEmail(subject: string, body: string): Promise<string> {
  return summarizeEmailWithOptions(subject, body)
}

export async function summarizeEmailWithOptions(subject: string, body: string, options?: AIOptions): Promise<string> {
  const provider = getAIProvider()
  const localMode = resolveLocalMode(options)

  try {
    switch (provider) {
      case "anthropic":
        return await anthropicSummarize(subject, body)
      case "openai":
        return await openaiSummarize(subject, body)
      case "local":
        return localMode === "true-slm" ? await trueSlmSummarize(subject, body) : localSummarize(subject, body)
    }
  } catch (error) {
    console.error(`AI summarize error (${provider}):`, error)
    return localSummarize(subject, body)
  }
}

export async function generateReplyDraft(subject: string, body: string, senderName: string): Promise<string> {
  return generateReplyDraftWithOptions(subject, body, senderName)
}

export async function generateReplyDraftWithOptions(
  subject: string,
  body: string,
  senderName: string,
  options?: AIOptions
): Promise<string> {
  const provider = getAIProvider()
  const localMode = resolveLocalMode(options)

  try {
    switch (provider) {
      case "anthropic":
        return await anthropicReplyDraft(subject, body, senderName)
      case "openai":
        return await openaiReplyDraft(subject, body, senderName)
      case "local":
        return localMode === "true-slm" ? await trueSlmReplyDraft(subject, body, senderName) : localReplyDraft(subject, body, senderName)
    }
  } catch (error) {
    console.error(`AI reply draft error (${provider}):`, error)
    return localReplyDraft(subject, body, senderName)
  }
}

export async function prioritizeEmail(subject: string, body: string, from: string): Promise<number> {
  return prioritizeEmailWithOptions(subject, body, from)
}

export async function prioritizeEmailWithOptions(
  subject: string,
  body: string,
  from: string,
  options?: AIOptions
): Promise<number> {
  const provider = getAIProvider()
  const localMode = resolveLocalMode(options)

  try {
    switch (provider) {
      case "anthropic":
        return await anthropicPrioritize(subject, body, from)
      case "openai":
        return await openaiPrioritize(subject, body, from)
      case "local":
        return localMode === "true-slm" ? await trueSlmPrioritize(subject, body, from) : localPrioritize(subject, body, from)
    }
  } catch (error) {
    console.error(`AI prioritize error (${provider}):`, error)
    return localPrioritize(subject, body, from)
  }
}

export function getTrueSlmStatus(): TrueSlmStatus {
  return { ...trueSlmStatus }
}

export async function getAIDebugInfo(options?: AIOptions): Promise<AIDebugInfo> {
  const selectedProvider = getAIProvider()
  const localMode = resolveLocalMode(options)
  const openaiModel = process.env.OPENAI_MODEL || "gpt-4.1-mini"
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY)
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY)

  if (selectedProvider === "anthropic") {
    return {
      selectedProvider,
      effectiveProvider: anthropicClient ? "anthropic" : "local",
      openaiModel,
      hasAnthropicKey,
      hasOpenAIKey,
      openaiSdkReady: Boolean(openaiClient),
      localMode,
      reason: anthropicClient ? "Anthropic selected and key present" : "Anthropic selected but client unavailable, falling back",
    }
  }

  if (selectedProvider === "openai") {
    const client = await getOpenAIClient()
    return {
      selectedProvider,
      effectiveProvider: client ? "openai" : "local",
      openaiModel,
      hasAnthropicKey,
      hasOpenAIKey,
      openaiSdkReady: Boolean(client),
      localMode,
      reason: client ? "OpenAI key and SDK available" : "OpenAI SDK missing/unavailable, using local fallback",
    }
  }

  return {
    selectedProvider,
    effectiveProvider: "local",
    openaiModel,
    hasAnthropicKey,
    hasOpenAIKey,
    openaiSdkReady: Boolean(openaiClient),
    localMode,
    reason: "No cloud AI keys configured",
  }
}
