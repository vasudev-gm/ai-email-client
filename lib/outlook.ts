export interface OutlookConfig {
  accessToken: string
}

export async function fetchOutlookEmails(config: OutlookConfig, folder = "inbox") {
  void config
  void folder
  return []
}

export async function sendOutlookEmail(config: OutlookConfig, options: {
  to: string
  cc?: string
  subject: string
  body: string
}) {
  void config
  void options
  return { success: true, messageId: `outlook_${Date.now()}` }
}
