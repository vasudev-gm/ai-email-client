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
  categories?: string[]
}

interface OutlookAttachment {
  id: string
  contentId?: string
  contentLocation?: string
  contentType?: string
  contentBytes?: string
  name?: string
  isInline?: boolean
}

const TRANSPARENT_PIXEL_DATA_URL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="

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
  "categories",
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

function normalizeCid(value?: string) {
  if (!value) return ""
  let normalized = value.trim().replace(/^cid:/i, "")
  normalized = normalized.replace(/^['"]+|['"]+$/g, "")
  if (normalized.startsWith("<") && normalized.endsWith(">")) {
    normalized = normalized.slice(1, -1)
  }
  try {
    normalized = decodeURIComponent(normalized)
  } catch {
    // Keep original value when CID cannot be URI-decoded.
  }
  return normalized.toLowerCase()
}

function replaceCidSources(html: string, cidToDataUrl: Map<string, string>) {
  return html.replace(/cid:([^"')\s,]+)/gi, (match, rawCid: string) => {
    const key = normalizeCid(rawCid)
    return cidToDataUrl.get(key) || match
  })
}

function neutralizeUnresolvedCidSources(html: string) {
  // Do not proxy unresolved CID URLs. Neutralizing them avoids request storms,
  // repeated 404s, and browser memory churn on template-heavy emails.
  return html.replace(/cid:([^"')\s,]+)/gi, TRANSPARENT_PIXEL_DATA_URL)
}

function isSafeInlineResourceUrl(url: string) {
  const normalized = url.trim().toLowerCase()
  if (normalized.startsWith("data:")) return true

  // blob: URLs are document-scoped and cid: is not browser-loadable.
  if (normalized.startsWith("blob:") || normalized.startsWith("cid:")) return false
  if (normalized.startsWith("javascript:")) return false

  // Allow common external image formats over HTTP(S).
  if (!/^https?:\/\//i.test(url.trim())) return false

  try {
    const parsed = new URL(url)
    const pathname = parsed.pathname.toLowerCase()
    return /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i.test(pathname)
  } catch {
    return false
  }
}

function sanitizeEmailImageResources(html: string) {
  let blockedBlobImages = false
  let blockedImageCount = 0

  // Remove srcset to avoid multiple parallel image fetches for one visual.
  let normalized = html.replace(/\s+srcset\s*=\s*("[^"]*"|'[^']*')/gi, "")

  // Ensure unsupported/proxy/remote image URLs do not trigger request bursts.
  normalized = normalized.replace(/(<img\b[^>]*\bsrc\s*=\s*["'])([^"']+)(["'][^>]*>)/gi, (full, start, src, end) => {
    if (/^blob:/i.test(src.trim())) {
      blockedBlobImages = true
    }
    if (isSafeInlineResourceUrl(src)) return `${start}${src}${end}`
    blockedImageCount += 1
    return `${start}${TRANSPARENT_PIXEL_DATA_URL}${end}`
  })

  // Neutralize background-image URLs that can also trigger network requests.
  normalized = normalized.replace(/url\((['"]?)([^)'"]+)\1\)/gi, (full, quote, url) => {
    if (/^blob:/i.test(url.trim())) {
      blockedBlobImages = true
    }
    if (isSafeInlineResourceUrl(url)) return full
    blockedImageCount += 1
    return `url(${TRANSPARENT_PIXEL_DATA_URL})`
  })

  return {
    html: normalized,
    blockedBlobImages: blockedBlobImages || blockedImageCount > 0,
    blockedImageCount,
  }
}

function stripDarkModeTemplateStyles(html: string) {
  // Many transactional templates embed dark-mode CSS that flips text colors
  // without fully updating background blocks, causing unreadable sections.
  let normalized = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (styleBlock) => {
    if (!/prefers-color-scheme\s*:\s*dark/i.test(styleBlock) && !/\[data-ogsc\]/i.test(styleBlock)) {
      return styleBlock
    }

    const withoutDarkMedia = styleBlock.replace(
      /@media[^{}]*prefers-color-scheme\s*:\s*dark[^{}]*\{[\s\S]*?\n\s*\}/gi,
      ""
    )
    const withoutOgsc = withoutDarkMedia.replace(/[^{}]*\[data-ogsc\][^{}]*\{[^{}]*\}/gi, "")

    // If the style block only contained dark-mode rules, drop it.
    return withoutOgsc.trim() === "" || /^<style\b[^>]*>\s*<\/style>$/i.test(withoutOgsc)
      ? ""
      : withoutOgsc
  })

  normalized = normalized.replace(/\sdata-ogsc(?:="[^"]*")?/gi, "")

  return normalized
}

async function fetchInlineAttachmentsBestEffort(config: OutlookConfig, messageId: string) {
  try {
    const encodedId = encodeURIComponent(messageId)
    const listPath = `/me/messages/${encodedId}/attachments?$top=100&$select=${encodeURIComponent("id,contentId,contentLocation,contentType,contentBytes,name,isInline")}`
    const list = (await fetchGraph(config, listPath)) as { value?: OutlookAttachment[] }
    const inlineItems = (list.value || []).filter((attachment) =>
      attachment.isInline || Boolean(attachment.contentId) || Boolean(attachment.contentLocation)
    )

    const resolved = await Promise.all(
      inlineItems.map(async (attachment) => {
        if (attachment.contentBytes) return attachment
        try {
          const detailPath = `/me/messages/${encodedId}/attachments/${encodeURIComponent(attachment.id)}?$select=${encodeURIComponent("id,contentId,contentLocation,contentType,contentBytes,name,isInline")}`
          const detail = (await fetchGraph(config, detailPath)) as OutlookAttachment
          return { ...attachment, ...detail }
        } catch {
          return attachment
        }
      })
    )

    return resolved.filter((attachment) =>
      Boolean(attachment.contentId || attachment.contentLocation || attachment.name)
    )
  } catch {
    return []
  }
}

async function resolveInlineCidImagesBestEffort(config: OutlookConfig, messageId: string, html: string) {
  if (!/cid:/i.test(html)) return html

  const inlineAttachments = await fetchInlineAttachmentsBestEffort(config, messageId)
  if (inlineAttachments.length === 0) return html

  const cidToDataUrl = new Map<string, string>()
  for (const attachment of inlineAttachments) {
    if (!attachment.contentId || !attachment.contentBytes) continue
    const key = normalizeCid(attachment.contentId)
    if (!key) continue
    const type = attachment.contentType || "application/octet-stream"
    cidToDataUrl.set(key, `data:${type};base64,${attachment.contentBytes}`)
  }

  if (cidToDataUrl.size === 0) return html
  return replaceCidSources(html, cidToDataUrl)
}

function toEmailData(message: OutlookMessage, folder: string, options?: { blockedBlobImages?: boolean; blockedImageCount?: number }) {
  const normalizedFolder = folder.toUpperCase()
  const isDeleted = normalizedFolder === "DELETED"
  const isSent = normalizedFolder === "SENT"
  const isDraft = normalizedFolder === "DRAFTS"
  const isArchived = normalizedFolder === "ARCHIVED"

  const categories = message.categories || []

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
    blockedBlobImages: options?.blockedBlobImages,
    blockedImageCount: options?.blockedImageCount,
    labels: categories.map((category) => ({
      labelId: category,
      label: {
        name: category,
        color: "#0ea5e9",
      },
    })),
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

  if (response.status === 204 || response.status === 202) return null

  const contentType = response.headers.get("content-type") || ""
  const rawBody = await response.text()
  if (!rawBody.trim()) return null

  if (contentType.toLowerCase().includes("application/json")) {
    return JSON.parse(rawBody)
  }

  return rawBody
}

function getFolderPath(folder: string) {
  const normalized = folder.toUpperCase()
  if (normalized === "INBOX") return "/me/mailFolders/inbox/messages"
  if (normalized === "SENT") return "/me/mailFolders/sentitems/messages"
  if (normalized === "DRAFTS") return "/me/mailFolders/drafts/messages"
  if (normalized === "JUNK") return "/me/mailFolders/junkemail/messages"
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

  if (isHtmlBody(data) && data.body?.content) {
    const htmlWithImages = await resolveInlineCidImagesBestEffort(config, id, data.body.content)
    const htmlWithoutDarkTemplateRules = stripDarkModeTemplateStyles(htmlWithImages)
    const htmlWithoutUnresolvedCid = neutralizeUnresolvedCidSources(htmlWithoutDarkTemplateRules)
    const sanitized = sanitizeEmailImageResources(htmlWithoutUnresolvedCid)
    data.body.content = sanitized.html
    return toEmailData(data, "INBOX", {
      blockedBlobImages: sanitized.blockedBlobImages,
      blockedImageCount: sanitized.blockedImageCount,
    })
  }

  return toEmailData(data, "INBOX")
}

export async function patchOutlookEmail(config: OutlookConfig, id: string, updates: {
  isRead?: boolean
  isStarred?: boolean
  addLabels?: string[]
}) {
  const body: Record<string, unknown> = {}
  if (typeof updates.isRead === "boolean") {
    body.isRead = updates.isRead
  }
  if (typeof updates.isStarred === "boolean") {
    body.flag = { flagStatus: updates.isStarred ? "flagged" : "notFlagged" }
  }

  if (Array.isArray(updates.addLabels) && updates.addLabels.length > 0) {
    const current = await fetchGraph(
      config,
      `/me/messages/${encodeURIComponent(id)}?$select=${encodeURIComponent("categories")}`
    ) as { categories?: string[] }
    const existing = current?.categories || []
    const merged = Array.from(new Set([
      ...existing,
      ...updates.addLabels.map((label) => label.trim()).filter(Boolean),
    ]))
    body.categories = merged
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

export async function moveOutlookEmail(
  config: OutlookConfig,
  id: string,
  destinationId: "archive" | "inbox" | "junkemail" | "deleteditems" | "drafts" | "sentitems"
) {
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
