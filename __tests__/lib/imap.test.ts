import { ImapFlow } from "imapflow"
import { verifyImapConnection } from "@/lib/imap"

jest.mock("imapflow", () => ({
  ImapFlow: jest.fn(),
}))

describe("verifyImapConnection", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("connects and opens mailbox with secure defaults", async () => {
    const connect = jest.fn().mockResolvedValue(undefined)
    const mailboxOpen = jest.fn().mockResolvedValue(undefined)
    const logout = jest.fn().mockResolvedValue(undefined)

    const mockImapFlow = ImapFlow as unknown as jest.Mock
    mockImapFlow.mockImplementation(() => ({
      connect,
      mailboxOpen,
      logout,
      close: jest.fn(),
      closed: false,
    }))

    await verifyImapConnection({
      host: "imap.gmail.com",
      port: 993,
      user: "me@example.com",
      password: "app-password",
    })

    expect(ImapFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "imap.gmail.com",
        port: 993,
        secure: true,
        auth: {
          user: "me@example.com",
          pass: "app-password",
        },
      })
    )
    expect(connect).toHaveBeenCalled()
    expect(mailboxOpen).toHaveBeenCalledWith("INBOX")
    expect(logout).toHaveBeenCalled()
  })

  it("rejects invalid IMAP host before attempting connection", async () => {
    await expect(
      verifyImapConnection({
        host: "  ",
        port: 993,
        user: "me@example.com",
        password: "app-password",
      })
    ).rejects.toThrow("IMAP host is required")

    expect(ImapFlow).not.toHaveBeenCalled()
  })
})
