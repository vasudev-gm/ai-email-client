import { fireEvent, render, screen } from "@testing-library/react"
import AccountSwitcher from "@/components/AccountSwitcher"

const mockSignIn = jest.fn()

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { email: "me@example.com" } },
    status: "authenticated",
  }),
  signIn: (...args: unknown[]) => mockSignIn(...args),
}))

describe("AccountSwitcher", () => {
  beforeEach(() => {
    mockSignIn.mockReset()
    jest.spyOn(Storage.prototype, "getItem").mockReturnValue(null)
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("can add a new account", async () => {
    mockSignIn.mockResolvedValue({ ok: true })
    render(<AccountSwitcher />)

    fireEvent.click(screen.getByRole("button", { name: /me@example.com/i }))
    fireEvent.click(screen.getByRole("button", { name: /add account/i }))
    expect(screen.getByRole("dialog", { name: /add account/i })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/provider/i), {
      target: { value: "IMAP" },
    })
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: "new@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/imap host/i), {
      target: { value: "imap.example.com" },
    })
    fireEvent.change(screen.getByLabelText(/password \/ app password/i), {
      target: { value: "secret123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }))

    expect(await screen.findByText("new@example.com")).toBeInTheDocument()
  })

  it("starts Google OAuth flow from add account", () => {
    render(<AccountSwitcher />)

    fireEvent.click(screen.getByRole("button", { name: /me@example.com/i }))
    fireEvent.click(screen.getByRole("button", { name: /add account/i }))
    fireEvent.change(screen.getByLabelText(/provider/i), {
      target: { value: "Google" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }))

    expect(mockSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/" })
  })

  it("adds Gmail IMAP account with provider defaults", async () => {
    mockSignIn.mockResolvedValue({ ok: true })
    render(<AccountSwitcher />)

    fireEvent.click(screen.getByRole("button", { name: /me@example.com/i }))
    fireEvent.click(screen.getByRole("button", { name: /add account/i }))
    fireEvent.change(screen.getByLabelText(/provider/i), {
      target: { value: "Gmail" },
    })
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: "gmail.user@gmail.com" },
    })
    fireEvent.change(screen.getByLabelText(/password \/ app password/i), {
      target: { value: "app-password" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }))

    expect(mockSignIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({
        email: "gmail.user@gmail.com",
        imapHost: "imap.gmail.com",
        imapPort: "993",
      })
    )
    expect(await screen.findByText("gmail.user@gmail.com")).toBeInTheDocument()
  })

  it("adds Google IMAP fallback account with provider defaults", async () => {
    mockSignIn.mockResolvedValue({ ok: true })
    render(<AccountSwitcher />)

    fireEvent.click(screen.getByRole("button", { name: /me@example.com/i }))
    fireEvent.click(screen.getByRole("button", { name: /add account/i }))
    fireEvent.change(screen.getByLabelText(/provider/i), {
      target: { value: "GoogleIMAP" },
    })
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: "google.imap@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/password \/ app password/i), {
      target: { value: "app-password" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }))

    expect(mockSignIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({
        email: "google.imap@example.com",
        imapHost: "imap.gmail.com",
        imapPort: "993",
      })
    )
    expect(await screen.findByText("google.imap@example.com")).toBeInTheDocument()
  })

  it("adds Microsoft IMAP fallback account with provider defaults", async () => {
    mockSignIn.mockResolvedValue({ ok: true })
    render(<AccountSwitcher />)

    fireEvent.click(screen.getByRole("button", { name: /me@example.com/i }))
    fireEvent.click(screen.getByRole("button", { name: /add account/i }))
    fireEvent.change(screen.getByLabelText(/provider/i), {
      target: { value: "MicrosoftIMAP" },
    })
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: "msft.imap@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/password \/ app password/i), {
      target: { value: "app-password" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }))

    expect(mockSignIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({
        email: "msft.imap@example.com",
        imapHost: "outlook.office365.com",
        imapPort: "993",
      })
    )
    expect(await screen.findByText("msft.imap@example.com")).toBeInTheDocument()
  })

  it("requires Gmail provider for @gmail.com when using Google IMAP fallback", async () => {
    render(<AccountSwitcher />)

    fireEvent.click(screen.getByRole("button", { name: /me@example.com/i }))
    fireEvent.click(screen.getByRole("button", { name: /add account/i }))
    fireEvent.change(screen.getByLabelText(/provider/i), {
      target: { value: "GoogleIMAP" },
    })
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: "person@gmail.com" },
    })
    fireEvent.change(screen.getByLabelText(/password \/ app password/i), {
      target: { value: "app-password" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }))

    expect(await screen.findByText(/use gmail \(imap direct\) for @gmail\.com addresses\./i)).toBeInTheDocument()
    expect(mockSignIn).not.toHaveBeenCalled()
  })
})
