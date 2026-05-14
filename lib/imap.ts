export interface ImapConfig {
  host: string
  port: number
  user: string
  password: string
  tls?: boolean
}

export async function fetchImapEmails(config: ImapConfig, folder = "INBOX") {
  void config
  void folder
  return []
}
