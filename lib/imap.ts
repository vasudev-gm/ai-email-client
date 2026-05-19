import { ImapFlow } from "imapflow"

export interface ImapConfig {
  host: string
  port: number
  user: string
  password: string
  tls?: boolean
}

const SMTP_PORTS = new Set([25, 465, 587])

export function normalizeImapEndpoint(host: string, port: number) {
  const trimmedHost = host.trim()
  const lowerHost = trimmedHost.toLowerCase()

  let normalizedHost = trimmedHost
  if (lowerHost === "smtp.office365.com") {
    normalizedHost = "outlook.office365.com"
  } else if (lowerHost === "smtp-mail.outlook.com") {
    normalizedHost = "imap-mail.outlook.com"
  } else if (lowerHost.startsWith("smtp.")) {
    normalizedHost = `imap.${trimmedHost.slice(5)}`
  }

  const normalizedPort =
    normalizedHost !== trimmedHost && SMTP_PORTS.has(port) ? 993 : port

  return { host: normalizedHost, port: normalizedPort }
}

function assertValidImapConfig(config: ImapConfig) {
  if (!config.host.trim()) {
    throw new Error("IMAP host is required")
  }
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error("IMAP port must be between 1 and 65535")
  }
  if (!config.user.trim()) {
    throw new Error("IMAP user is required")
  }
  if (!config.password) {
    throw new Error("IMAP password is required")
  }
}

export async function verifyImapConnection(config: ImapConfig, folder = "INBOX") {
  assertValidImapConfig(config)
  const endpoint = normalizeImapEndpoint(config.host, config.port)
  const client = new ImapFlow({
    host: endpoint.host,
    port: endpoint.port,
    secure: config.tls ?? true,
    auth: {
      user: config.user.trim(),
      pass: config.password,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    logger: false,
  })

  try {
    await client.connect()
    await client.mailboxOpen(folder)
  } finally {
    try {
      await client.logout()
    } catch {
      client.close()
    }
  }
}

export async function fetchImapEmails(config: ImapConfig, folder = "INBOX") {
  await verifyImapConnection(config, folder)
  return []
}
