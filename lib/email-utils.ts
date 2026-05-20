export interface EmailData {
  id: string
  accountId: string
  messageId: string
  threadId?: string | null
  from: string
  to: string
  cc?: string | null
  bcc?: string | null
  subject: string
  bodyText?: string | null
  bodyHtml?: string | null
  date: Date | string
  isRead: boolean
  isStarred: boolean
  isArchived: boolean
  isDeleted: boolean
  isDraft: boolean
  isSent: boolean
  folder: string
  aiSummary?: string | null
  aiPriority?: number | null
  aiDraft?: string | null
  blockedBlobImages?: boolean
  blockedImageCount?: number
  labels?: { labelId: string; label: { name: string; color: string } }[]
}

export function formatEmailDate(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } else if (days === 1) {
    return "Yesterday"
  } else if (days < 7) {
    return d.toLocaleDateString([], { weekday: "short" })
  } else {
    return d.toLocaleDateString([], { month: "short", day: "numeric" })
  }
}

export function extractEmailAddress(emailStr: string): string {
  const match = emailStr.match(/<(.+?)>/)
  return match ? match[1] : emailStr
}

export function extractDisplayName(emailStr: string): string {
  const match = emailStr.match(/^(.+?)\s*</)
  return match ? match[1].trim() : emailStr
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}

export const MOCK_EMAILS: EmailData[] = [
  {
    id: "1",
    accountId: "acc1",
    messageId: "msg1",
    threadId: "thread1",
    from: "Alice Johnson <alice@example.com>",
    to: "me@example.com",
    subject: "Q4 Planning Meeting - Action Items",
    bodyText: "Hi,\n\nFollowing up on our Q4 planning meeting. Here are the key action items we discussed:\n\n1. Review budget allocations by Friday\n2. Submit project proposals by end of month\n3. Schedule follow-up with stakeholders\n\nPlease confirm receipt and let me know if you have any questions.\n\nBest,\nAlice",
    bodyHtml: "<p>Hi,</p><p>Following up on our Q4 planning meeting. Here are the key action items we discussed:</p><ol><li>Review budget allocations by Friday</li><li>Submit project proposals by end of month</li><li>Schedule follow-up with stakeholders</li></ol><p>Please confirm receipt and let me know if you have any questions.</p><p>Best,<br>Alice</p>",
    date: new Date(Date.now() - 1000 * 60 * 30),
    isRead: false,
    isStarred: true,
    isArchived: false,
    isDeleted: false,
    isDraft: false,
    isSent: false,
    folder: "INBOX",
    aiPriority: 4,
    labels: [],
  },
  {
    id: "2",
    accountId: "acc1",
    messageId: "msg2",
    threadId: "thread2",
    from: "GitHub <noreply@github.com>",
    to: "me@example.com",
    subject: "[ai-email-client] PR #42: Add dark mode support",
    bodyText: "A new pull request has been opened by devuser.\n\nTitle: Add dark mode support\nBranch: feature/dark-mode\n\nChanges include Tailwind dark mode classes and a theme toggle component.\n\nView on GitHub: https://github.com/example/repo/pull/42",
    date: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isRead: true,
    isStarred: false,
    isArchived: false,
    isDeleted: false,
    isDraft: false,
    isSent: false,
    folder: "INBOX",
    aiPriority: 3,
    labels: [],
  },
  {
    id: "3",
    accountId: "acc1",
    messageId: "msg3",
    threadId: "thread3",
    from: "Bob Smith <bob@company.com>",
    to: "me@example.com",
    subject: "Re: Project deadline extension request",
    bodyText: "I understand your concern about the deadline. After discussing with management, we can extend the deadline by two weeks to December 15th. Please ensure all deliverables are submitted by then.\n\nRegards,\nBob",
    date: new Date(Date.now() - 1000 * 60 * 60 * 5),
    isRead: false,
    isStarred: false,
    isArchived: false,
    isDeleted: false,
    isDraft: false,
    isSent: false,
    folder: "INBOX",
    aiPriority: 5,
    labels: [],
  },
  {
    id: "4",
    accountId: "acc1",
    messageId: "msg4",
    threadId: "thread4",
    from: "newsletter@techdigest.com",
    to: "me@example.com",
    subject: "Tech Digest Weekly: AI Trends, Cloud Updates & More",
    bodyText: "This week in tech: Major AI announcements, cloud infrastructure updates, and the latest in open source development. Read our curated selection of the most important tech news.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24),
    isRead: true,
    isStarred: false,
    isArchived: false,
    isDeleted: false,
    isDraft: false,
    isSent: false,
    folder: "INBOX",
    aiPriority: 1,
    labels: [],
  },
  {
    id: "5",
    accountId: "acc1",
    messageId: "msg5",
    threadId: "thread5",
    from: "Carol Williams <carol@design.co>",
    to: "me@example.com",
    subject: "Design review feedback - Mobile UI",
    bodyText: "Hi,\n\nI've reviewed the mobile UI mockups. Overall great work! A few suggestions:\n\n- Increase tap target sizes for better accessibility\n- Consider adding swipe gestures for email actions\n- The color contrast on the sidebar could be improved\n\nLet's schedule a review call to discuss.\n\nCarol",
    date: new Date(Date.now() - 1000 * 60 * 60 * 48),
    isRead: false,
    isStarred: true,
    isArchived: false,
    isDeleted: false,
    isDraft: false,
    isSent: false,
    folder: "INBOX",
    aiPriority: 3,
    labels: [],
  },
  {
    id: "6",
    accountId: "acc1",
    messageId: "msg6",
    threadId: "thread6",
    from: "me@example.com",
    to: "team@company.com",
    subject: "Sprint retrospective notes",
    bodyText: "Team,\n\nHere are the notes from our sprint retrospective...",
    date: new Date(Date.now() - 1000 * 60 * 60 * 72),
    isRead: true,
    isStarred: false,
    isArchived: false,
    isDeleted: false,
    isDraft: false,
    isSent: true,
    folder: "SENT",
    aiPriority: 2,
    labels: [],
  },
]
