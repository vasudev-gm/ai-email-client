export interface OutlookConfig {
  accessToken: string
}

interface OutlookRecipient {
  emailAddress?: {
    name?: string
    address?: string
  }
}

interface OutlookMessage {
  id: string
  internetMessageId?: string
  conversationId?: string
  from?: OutlookRecipient
  toRecipients?: OutlookRecipient[]
  ccRecipients?: OutlookRecipient[]
  bccRecipients?: OutlookRecipient[]
  subject?: string
  bodyPreview?: string
  body?: {
    contentType?: string
    content?: string
  }
  receivedDateTime?: string
  isRead?: boolean
  flag?: {
    flagStatus?: string
  }
}

const DEFAULT_SELECT = [
  "id",
  "internetMessageId",
  "conversationId",
  "from",
  "toRecipients",
  "ccRecipients",
  "bccRecipients",
  "subject",
  "bodyPreview",
  "body",
  "receivedDateTime",
  "isRead",
  "flag",
].join(",")

function formatRecipient(recipient?: OutlookRecipient) {
  const name = recipient?.emailAddress?.name?.trim()
  const address = recipient?.emailAddress?.address?.trim() || ""
  if (!address) return ""
  return name ? `${name} <${address}>` : address
}

function formatRecipientList(recipients: OutlookRecipient[] = []) {
  return recipients
    .map((recipient) => formatRecipient(recipient))
    .filter(Boolean)
    .join(", ")
}

function isHtmlBody(message: OutlookMessage) {
  return message.body?.contentType?.toLowerCase() === "html"
}

function toEmailData(message: OutlookMessage, folder: string) {
  const normalizedFolder = folder.toUpperCase()
  const isDeleted = normalizedFolder === "DELETED"
  const isSent = normalizedFolder === "SENT"
  const isDraft = normalizedFolder === "DRAFTS"
  const isArchived = normalizedFolder === "ARCHIVED"

  return {
    id: message.id,
    accountId: "outlook",
    messageId: message.internetMessageId || message.id,
    threadId: message.conversationId || null,
    from: formatRecipient(message.from),
    to: formatRecipientList(message.toRecipients),
    cc: formatRecipientList(message.ccRecipients) || null,
    bcc: formatRecipientList(message.bccRecipients) || null,
    subject: message.subject || "(no subject)",
    bodyText: isHtmlBody(message) ? (message.bodyPreview || "") : (message.body?.content || message.bodyPreview || ""),
    bodyHtml: isHtmlBody(message) ? (message.body?.content || null) : null,
    date: message.receivedDateTime || new Date().toISOString(),
    isRead: Boolean(message.isRead),
    isStarred: message.flag?.flagStatus === "flagged",
    isArchived,
    isDeleted,
    isDraft,
    isSent,
    folder: normalizedFolder,
    aiPriority: null,
    labels: [],
  }
}

async function fetchGraph(config: OutlookConfig, path: string, init?: RequestInit) {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Graph request failed (${response.status}): ${body}`)
  }

  if (response.status === 204) return null
  return response.json()
}

function getFolderPath(folder: string) {
  const normalized = folder.toUpperCase()
  if (normalized === "INBOX") return "/me/mailFolders/inbox/messages"
  if (normalized === "SENT") return "/me/mailFolders/sentitems/messages"
  if (normalized === "DRAFTS") return "/me/mailFolders/drafts/messages"
  if (normalized === "DELETED") return "/me/mailFolders/deleteditems/messages"
  if (normalized === "ARCHIVED") return "/me/mailFolders/archive/messages"
  if (normalized === "STARRED") {
    return `/me/messages?$select=${encodeURIComponent(DEFAULT_SELECT)}&$top=50&$orderby=receivedDateTime desc&$filter=${encodeURIComponent("flag/flagStatus eq 'flagged'")}`
  }
  return "/me/messages"
}

export async function fetchOutlookEmails(config: OutlookConfig, folder = "INBOX") {
  const basePath = getFolderPath(folder)
  const path = basePath.includes("?")
    ? basePath
    : `${basePath}?$select=${encodeURIComponent(DEFAULT_SELECT)}&$top=50&$orderby=receivedDateTime desc`
  const data = (await fetchGraph(config, path)) as { value?: OutlookMessage[] }
  return (data.value || []).map((message) => toEmailData(message, folder))
}

export async function fetchOutlookEmailById(config: OutlookConfig, id: string) {
  const data = (await fetchGraph(
    config,
    `/me/messages/${encodeURIComponent(id)}?$select=${encodeURIComponent(DEFAULT_SELECT)}`
  )) as OutlookMessage
  return toEmailData(data, "INBOX")
}

export async function patchOutlookEmail(config: OutlookConfig, id: string, updates: {
  isRead?: boolean
  isStarred?: boolean
}) {
  const body: Record<string, unknown> = {}
  if (typeof updates.isRead === "boolean") {
    body.isRead = updates.isRead
  }
  if (typeof updates.isStarred === "boolean") {
    body.flag = { flagStatus: updates.isStarred ? "flagged" : "notFlagged" }
  }

  if (Object.keys(body).length === 0) return

  await fetchGraph(config, `/me/messages/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export async function deleteOutlookEmail(config: OutlookConfig, id: string) {
  await fetchGraph(config, `/me/messages/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

export async function moveOutlookEmail(config: OutlookConfig, id: string, destinationId: "archive" | "inbox") {
  await fetchGraph(config, `/me/messages/${encodeURIComponent(id)}/move`, {
    method: "POST",
    body: JSON.stringify({ destinationId }),
  })
}

export async function sendOutlookEmail(config: OutlookConfig, options: {
  to: string
  cc?: string
  bcc?: string
  subject: string
  body: string
}) {
  const parseRecipients = (value?: string) =>
    (value || "")
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((address) => ({ emailAddress: { address } }))

  const payload = {
    message: {
      subject: options.subject,
      body: {
        contentType: "Text",
        content: options.body,
      },
      toRecipients: parseRecipients(options.to),
      ccRecipients: parseRecipients(options.cc),
      bccRecipients: parseRecipients(options.bcc),
    },
    saveToSentItems: true,
  }

  await fetchGraph(config, "/me/sendMail", {
    method: "POST",
    body: JSON.stringify(payload),
  })

  return { success: true, messageId: `outlook_${Date.now()}` }
}
