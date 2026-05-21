import { EmailData } from "@/lib/email-utils"

export interface GmailConfig {
  accessToken: string
  refreshToken?: string
}

export class GmailApiError extends Error {
  status: number
  responseBody: string
  apiCode?: number
  apiStatus?: string

  constructor(status: number, responseBody: string) {
    let message = `Gmail request failed (${status})`
    let apiCode: number | undefined
    let apiStatus: string | undefined

    try {
      const parsed = JSON.parse(responseBody) as {
        error?: {
          code?: number
          message?: string
          status?: string
        }
      }
      apiCode = parsed?.error?.code
      apiStatus = parsed?.error?.status
      if (parsed?.error?.message) {
        message = parsed.error.message
      }
    } catch {
      if (responseBody?.trim()) {
        message = responseBody.slice(0, 300)
      }
    }

    super(message)
    this.name = "GmailApiError"
    this.status = status
    this.responseBody = responseBody
    this.apiCode = apiCode
    this.apiStatus = apiStatus
  }
}

interface GmailHeader {
  name: string
  value: string
}

interface GmailMessagePart {
  mimeType?: string
  filename?: string
  body?: {
    data?: string
  }
  headers?: GmailHeader[]
  parts?: GmailMessagePart[]
}

interface GmailMessage {
  id: string
  threadId?: string
  labelIds?: string[]
  snippet?: string
  payload?: GmailMessagePart
  internalDate?: string
}

interface GmailLabel {
  id: string
  name?: string
  type?: string
  color?: {
    textColor?: string
    backgroundColor?: string
  }
  messagesUnread?: number
}

function toBase64Url(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function decodeBase64Url(input?: string) {
  if (!input) return ""
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/")
  const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4))
  return Buffer.from(base64 + padding, "base64").toString("utf8")
}

async function fetchGmail<T>(config: GmailConfig, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new GmailApiError(response.status, body)
  }

  if (response.status === 204) {
    return null as T
  }

  const text = await response.text()
  if (!text.trim()) {
    return null as T
  }

  return JSON.parse(text) as T
}

function getHeaderValue(headers: GmailHeader[] | undefined, name: string) {
  if (!headers) return ""
  return headers.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value || ""
}

function collectBodyParts(part?: GmailMessagePart): GmailMessagePart[] {
  if (!part) return []
  const parts = [part]
  for (const child of part.parts || []) {
    parts.push(...collectBodyParts(child))
  }
  return parts
}

function extractBodyText(message: GmailMessage) {
  const parts = collectBodyParts(message.payload)
  const plainPart = parts.find((part) => part.mimeType?.toLowerCase() === "text/plain" && part.body?.data)
  if (plainPart?.body?.data) return decodeBase64Url(plainPart.body.data)
  return message.snippet || ""
}

function extractBodyHtml(message: GmailMessage) {
  const parts = collectBodyParts(message.payload)
  const htmlPart = parts.find((part) => part.mimeType?.toLowerCase() === "text/html" && part.body?.data)
  if (htmlPart?.body?.data) return decodeBase64Url(htmlPart.body.data)
  return null
}

function inferFolder(labelIds: string[] = []) {
  if (labelIds.includes("SPAM")) return "JUNK"
  if (labelIds.includes("TRASH")) return "DELETED"
  if (labelIds.includes("DRAFT")) return "DRAFTS"
  if (labelIds.includes("SENT")) return "SENT"
  if (labelIds.includes("STARRED")) return "STARRED"
  if (labelIds.includes("INBOX")) return "INBOX"
  return "ARCHIVED"
}

function mapGmailFolderToLabelId(folder: string) {
  const normalized = folder.toUpperCase()
  if (normalized === "INBOX") return "INBOX"
  if (normalized === "STARRED") return "STARRED"
  if (normalized === "SENT") return "SENT"
  if (normalized === "DRAFTS") return "DRAFT"
  if (normalized === "JUNK") return "SPAM"
  if (normalized === "DELETED") return "TRASH"
  if (normalized === "ARCHIVED") return "ARCHIVED"
  return null
}

function toEmailData(message: GmailMessage, requestedFolder?: string): EmailData {
  const labelIds = message.labelIds || []
  const from = getHeaderValue(message.payload?.headers, "From")
  const to = getHeaderValue(message.payload?.headers, "To")
  const cc = getHeaderValue(message.payload?.headers, "Cc")
  const bcc = getHeaderValue(message.payload?.headers, "Bcc")
  const subject = getHeaderValue(message.payload?.headers, "Subject") || "(no subject)"
  const messageId = getHeaderValue(message.payload?.headers, "Message-Id") || message.id
  const folder = requestedFolder?.toUpperCase() || inferFolder(labelIds)

  const displayLabels = labelIds
    .filter((id) => !["INBOX", "UNREAD", "STARRED", "SENT", "DRAFT", "TRASH", "SPAM", "IMPORTANT", "CATEGORY_PERSONAL", "CATEGORY_SOCIAL", "CATEGORY_PROMOTIONS", "CATEGORY_UPDATES", "CATEGORY_FORUMS"].includes(id))
    .map((id) => ({
      labelId: id,
      label: {
        name: id,
        color: "#64748b",
      },
    }))

  return {
    id: message.id,
    accountId: "gmail",
    messageId,
    threadId: message.threadId || null,
    from,
    to,
    cc: cc || null,
    bcc: bcc || null,
    subject,
    bodyText: extractBodyText(message),
    bodyHtml: extractBodyHtml(message),
    date: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : new Date().toISOString(),
    isRead: !labelIds.includes("UNREAD"),
    isStarred: labelIds.includes("STARRED"),
    isArchived: !labelIds.includes("INBOX") && !labelIds.includes("TRASH") && !labelIds.includes("SPAM") && !labelIds.includes("SENT") && !labelIds.includes("DRAFT"),
    isDeleted: labelIds.includes("TRASH"),
    isDraft: labelIds.includes("DRAFT"),
    isSent: labelIds.includes("SENT"),
    folder,
    aiPriority: null,
    labels: displayLabels,
  }
}

async function getOrCreateGmailLabelIds(config: GmailConfig, labelNames: string[]) {
  if (!labelNames.length) return [] as string[]

  const payload = await fetchGmail<{ labels?: GmailLabel[] }>(config, "/users/me/labels")
  const labels = payload?.labels || []
  const byLowerName = new Map(
    labels
      .filter((label) => label.name)
      .map((label) => [String(label.name).toLowerCase(), label.id])
  )

  const resolvedIds: string[] = []
  for (const raw of labelNames) {
    const name = raw.trim()
    if (!name) continue
    const existing = byLowerName.get(name.toLowerCase())
    if (existing) {
      resolvedIds.push(existing)
      continue
    }

    const created = await fetchGmail<{ id: string }>(config, "/users/me/labels", {
      method: "POST",
      body: JSON.stringify({
        name,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
      }),
    })
    if (created?.id) {
      byLowerName.set(name.toLowerCase(), created.id)
      resolvedIds.push(created.id)
    }
  }

  return resolvedIds
}

function buildListQuery(folder: string, options?: { unreadOnly?: boolean }) {
  const unreadQuery = options?.unreadOnly ? "is:unread" : ""
  const normalized = folder.toUpperCase()
  if (normalized === "INBOX") {
    return `/users/me/messages?maxResults=50&labelIds=INBOX${unreadQuery ? `&q=${encodeURIComponent(unreadQuery)}` : ""}`
  }
  if (normalized === "STARRED") {
    return `/users/me/messages?maxResults=50&labelIds=STARRED${unreadQuery ? `&q=${encodeURIComponent(unreadQuery)}` : ""}`
  }
  if (normalized === "SENT") {
    return `/users/me/messages?maxResults=50&labelIds=SENT${unreadQuery ? `&q=${encodeURIComponent(unreadQuery)}` : ""}`
  }
  if (normalized === "DRAFTS") {
    return `/users/me/messages?maxResults=50&labelIds=DRAFT${unreadQuery ? `&q=${encodeURIComponent(unreadQuery)}` : ""}`
  }
  if (normalized === "DELETED") {
    return `/users/me/messages?maxResults=50&labelIds=TRASH${unreadQuery ? `&q=${encodeURIComponent(unreadQuery)}` : ""}`
  }
  if (normalized === "JUNK") {
    return `/users/me/messages?maxResults=50&labelIds=SPAM${unreadQuery ? `&q=${encodeURIComponent(unreadQuery)}` : ""}`
  }
  if (normalized === "ARCHIVED") {
    const archivedQuery = `-in:inbox -in:sent -in:drafts -in:trash -in:spam${unreadQuery ? ` ${unreadQuery}` : ""}`
    return `/users/me/messages?maxResults=50&q=${encodeURIComponent(archivedQuery)}`
  }
  return `/users/me/messages?maxResults=50${unreadQuery ? `&q=${encodeURIComponent(unreadQuery)}` : ""}`
}

export async function fetchGmailFolderCount(config: GmailConfig, folder = "INBOX", options?: { unreadOnly?: boolean }) {
  const listPath = buildListQuery(folder, options).replace(/maxResults=\d+/i, "maxResults=1")
  const list = await fetchGmail<{ resultSizeEstimate?: number }>(config, listPath)
  return Number(list?.resultSizeEstimate || 0)
}

export async function fetchGmailUnreadFolderCounts(config: GmailConfig) {
  const labelsPayload = await fetchGmail<{ labels?: GmailLabel[] }>(config, "/users/me/labels")
  const labels = labelsPayload?.labels || []
  const byId = new Map(labels.map((label) => [label.id, Number(label.messagesUnread || 0)]))

  const archivedUnread = await fetchGmailFolderCount(config, "ARCHIVED", { unreadOnly: true })

  return {
    INBOX: byId.get("INBOX") || 0,
    STARRED: byId.get("STARRED") || 0,
    SENT: byId.get("SENT") || 0,
    DRAFTS: byId.get("DRAFT") || 0,
    ARCHIVED: archivedUnread,
    JUNK: byId.get("SPAM") || 0,
    DELETED: byId.get("TRASH") || 0,
  }
}

export async function fetchGmailEmails(config: GmailConfig, folder = "INBOX") {
  const listPath = buildListQuery(folder)
  const list = await fetchGmail<{ messages?: Array<{ id: string }> }>(config, listPath)
  const messageRefs = list?.messages || []

  if (!messageRefs.length) return [] as EmailData[]

  const messageResults = await Promise.allSettled(
    messageRefs.map((ref) =>
      fetchGmail<GmailMessage>(
        config,
        `/users/me/messages/${encodeURIComponent(ref.id)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Bcc&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=Message-Id`
      )
    )
  )

  const messages = messageResults
    .filter((result): result is PromiseFulfilledResult<GmailMessage> => result.status === "fulfilled")
    .map((result) => result.value)

  return messages.map((message) => toEmailData(message, folder))
}

export async function fetchGmailEmailById(config: GmailConfig, id: string) {
  const message = await fetchGmail<GmailMessage>(
    config,
    `/users/me/messages/${encodeURIComponent(id)}?format=full`
  )
  return toEmailData(message)
}

export async function patchGmailEmail(config: GmailConfig, id: string, updates: {
  isRead?: boolean
  isStarred?: boolean
  isArchived?: boolean
  isDeleted?: boolean
  isJunk?: boolean
  moveToFolder?: string
  addLabels?: string[]
}) {
  const addLabelIds: string[] = []
  const removeLabelIds: string[] = []

  if (typeof updates.isRead === "boolean") {
    if (updates.isRead) {
      removeLabelIds.push("UNREAD")
    } else {
      addLabelIds.push("UNREAD")
    }
  }

  if (typeof updates.isStarred === "boolean") {
    if (updates.isStarred) {
      addLabelIds.push("STARRED")
    } else {
      removeLabelIds.push("STARRED")
    }
  }

  if (typeof updates.isArchived === "boolean") {
    if (updates.isArchived) {
      removeLabelIds.push("INBOX")
    } else {
      addLabelIds.push("INBOX")
    }
  }

  if (typeof updates.isDeleted === "boolean") {
    if (updates.isDeleted) {
      await fetchGmail(config, `/users/me/messages/${encodeURIComponent(id)}/trash`, {
        method: "POST",
      })
    } else {
      await fetchGmail(config, `/users/me/messages/${encodeURIComponent(id)}/untrash`, {
        method: "POST",
      })
      addLabelIds.push("INBOX")
    }
  }

  if (typeof updates.isJunk === "boolean") {
    if (updates.isJunk) {
      addLabelIds.push("SPAM")
      removeLabelIds.push("INBOX")
    } else {
      removeLabelIds.push("SPAM")
      addLabelIds.push("INBOX")
    }
  }

  if (typeof updates.moveToFolder === "string" && updates.moveToFolder.trim()) {
    const target = updates.moveToFolder.trim().toUpperCase()
    if (target === "DELETED") {
      await fetchGmail(config, `/users/me/messages/${encodeURIComponent(id)}/trash`, {
        method: "POST",
      })
    } else if (target === "ARCHIVED") {
      removeLabelIds.push("INBOX", "SPAM", "TRASH")
    } else {
      const mapped = mapGmailFolderToLabelId(target)
      if (mapped && mapped !== "ARCHIVED") {
        addLabelIds.push(mapped)
        if (mapped !== "SPAM") {
          removeLabelIds.push("SPAM")
        }
        if (mapped !== "TRASH") {
          removeLabelIds.push("TRASH")
        }
      }
    }
  }

  if (Array.isArray(updates.addLabels) && updates.addLabels.length > 0) {
    const createdLabelIds = await getOrCreateGmailLabelIds(config, updates.addLabels)
    addLabelIds.push(...createdLabelIds)
  }

  const uniqueAddLabelIds = Array.from(new Set(addLabelIds))
  const uniqueRemoveLabelIds = Array.from(new Set(removeLabelIds)).filter((id) => !uniqueAddLabelIds.includes(id))

  if (!uniqueAddLabelIds.length && !uniqueRemoveLabelIds.length) return

  await fetchGmail(config, `/users/me/messages/${encodeURIComponent(id)}/modify`, {
    method: "POST",
    body: JSON.stringify({ addLabelIds: uniqueAddLabelIds, removeLabelIds: uniqueRemoveLabelIds }),
  })
}

export async function deleteGmailEmail(config: GmailConfig, id: string) {
  await fetchGmail(config, `/users/me/messages/${encodeURIComponent(id)}/trash`, {
    method: "POST",
  })
}

export async function permanentlyDeleteGmailEmail(config: GmailConfig, id: string) {
  await fetchGmail(config, `/users/me/messages/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

export async function sendGmailEmail(config: GmailConfig, options: {
  to: string
  cc?: string
  bcc?: string
  subject: string
  body: string
  replyToMessageId?: string
}) {
  const headers = [
    `To: ${options.to}`,
    options.cc ? `Cc: ${options.cc}` : "",
    options.bcc ? `Bcc: ${options.bcc}` : "",
    `Subject: ${options.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    options.replyToMessageId ? `In-Reply-To: ${options.replyToMessageId}` : "",
    options.replyToMessageId ? `References: ${options.replyToMessageId}` : "",
  ].filter(Boolean)

  const rawMessage = `${headers.join("\r\n")}\r\n\r\n${options.body}`

  const response = await fetchGmail<{ id: string }>(config, "/users/me/messages/send", {
    method: "POST",
    body: JSON.stringify({ raw: toBase64Url(rawMessage) }),
  })

  return { success: true, messageId: response?.id || `gmail_${Date.now()}` }
}
