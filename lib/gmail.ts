export interface GmailConfig {
  accessToken: string
  refreshToken?: string
}

export async function fetchGmailEmails(config: GmailConfig, folder = "INBOX") {
  void config
  void folder
  return []
}

export async function sendGmailEmail(config: GmailConfig, options: {
  to: string
  cc?: string
  bcc?: string
  subject: string
  body: string
  replyToMessageId?: string
}) {
  void config
  void options
  return { success: true, messageId: `gmail_${Date.now()}` }
}
