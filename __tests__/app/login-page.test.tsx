import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import LoginPage from "@/app/(auth)/login/page"

const mockSignIn = jest.fn()
const mockGetProviders = jest.fn()

jest.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  getProviders: (...args: unknown[]) => mockGetProviders(...args),
}))

describe("LoginPage", () => {
  beforeEach(() => {
    mockSignIn.mockReset()
    mockGetProviders.mockReset()
    mockGetProviders.mockResolvedValue({
      google: { id: "google", name: "Google" },
      "microsoft-entra-id": { id: "microsoft-entra-id", name: "Microsoft" },
    })
  })

  it("shows demo mode button and signs in demo user", async () => {
    mockSignIn.mockResolvedValue(undefined)
    render(<LoginPage />)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /continue in demo mode/i }))
    })

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: "demo@example.com",
        password: "demo-mode",
        imapHost: "demo.local",
        imapPort: "993",
        callbackUrl: "/",
      })
    })
  })

  it("prefers IMAP/SMTP by default and keeps OAuth2 options collapsed", async () => {
    render(<LoginPage />)

    expect(screen.getByRole("heading", { name: /sign in with imap\/smtp/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password \/ app password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/imap\/smtp host/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^port$/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/imap\/smtp host/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /connect via imap\/smtp/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /continue with google/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /use oauth2 sign-in options instead/i }))

    expect(await screen.findByRole("button", { name: /continue with google/i })).toBeInTheDocument()
    expect(await screen.findByRole("button", { name: /continue with microsoft/i })).toBeInTheDocument()
  })

  it("includes dark mode styles for system-theme rendering", () => {
    const { container } = render(<LoginPage />)
    expect(container.firstChild).toHaveClass("dark:from-slate-950")
    expect(screen.getByText("AI Email Client").closest("h1")).toHaveClass("dark:text-gray-100")
    expect(screen.getByLabelText(/email address/i)).toHaveClass("dark:bg-slate-950")
    expect(screen.getByRole("button", { name: /continue in demo mode/i })).toHaveClass("dark:bg-blue-950/30")
    expect(screen.getByRole("button", { name: /use oauth2 sign-in options instead/i })).toHaveClass("dark:text-blue-400")
  })

  it("prefills SMTP host based on common email domains", () => {
    render(<LoginPage />)

    const emailInput = screen.getByLabelText(/email address/i)
    const hostInput = screen.getByLabelText(/imap\/smtp host/i)

    fireEvent.change(emailInput, { target: { value: "person@gmail.com" } })
    expect(hostInput).toHaveValue("smtp.gmail.com")

    fireEvent.change(emailInput, { target: { value: "person@outlook.com" } })
    expect(hostInput).toHaveValue("smtp.office365.com")

    fireEvent.change(emailInput, { target: { value: "person@aol.com" } })
    expect(hostInput).toHaveValue("smtp.aol.com")
  })

  it("does not override a manually entered host when email changes", () => {
    render(<LoginPage />)

    const emailInput = screen.getByLabelText(/email address/i)
    const hostInput = screen.getByLabelText(/imap\/smtp host/i)

    fireEvent.change(emailInput, { target: { value: "person@gmail.com" } })
    fireEvent.change(hostInput, { target: { value: "custom.mail.example.com" } })
    fireEvent.change(emailInput, { target: { value: "person@outlook.com" } })

    expect(hostInput).toHaveValue("custom.mail.example.com")
  })

  it("shows an inline error when IMAP credentials sign-in fails", async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" })
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "person@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/password \/ app password/i), {
      target: { value: "not-the-right-password" },
    })
    fireEvent.change(screen.getByLabelText(/imap\/smtp host/i), {
      target: { value: "imap.example.com" },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /connect via imap\/smtp/i }))
    })

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/couldn't connect via imap/i)

    expect(mockSignIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({
        email: "person@example.com",
        password: "not-the-right-password",
        imapHost: "imap.example.com",
        callbackUrl: "/",
        redirect: false,
      })
    )
  })

  it("shows a Gmail-specific app password hint on credentials failure", async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" })
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "person@gmail.com" },
    })
    fireEvent.change(screen.getByLabelText(/password \/ app password/i), {
      target: { value: "bad-password" },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /connect via imap\/smtp/i }))
    })

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/for gmail/i)
    expect(alert).toHaveTextContent(/app password/i)
    expect(alert).toHaveTextContent(/imap\.gmail\.com/i)
  })

  it("shows a Microsoft-specific hint on credentials failure", async () => {
    mockGetProviders.mockResolvedValue({
      google: { id: "google", name: "Google" },
    })
    mockSignIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" })
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "person@outlook.com" },
    })
    fireEvent.change(screen.getByLabelText(/password \/ app password/i), {
      target: { value: "bad-password" },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /connect via imap\/smtp/i }))
    })

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/for microsoft accounts/i)
    expect(alert).toHaveTextContent(/outlook\.office365\.com/i)
    expect(alert).toHaveTextContent(/oauth2/i)
  })

  it("shows a Yahoo\/AOL-specific hint on credentials failure", async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" })
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "person@yahoo.com" },
    })
    fireEvent.change(screen.getByLabelText(/password \/ app password/i), {
      target: { value: "bad-password" },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /connect via imap\/smtp/i }))
    })

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/yahoo\/aol/i)
    expect(alert).toHaveTextContent(/app password/i)
  })

  it("shows the generic IMAP hint for other domains", async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" })
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "person@customdomain.example" },
    })
    fireEvent.change(screen.getByLabelText(/password \/ app password/i), {
      target: { value: "bad-password" },
    })
    fireEvent.change(screen.getByLabelText(/imap\/smtp host/i), {
      target: { value: "imap.customdomain.example" },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /connect via imap\/smtp/i }))
    })

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/verify host\/port/i)
    expect(alert).toHaveTextContent(/app password/i)
  })

  it("shows a Microsoft OAuth reliability hint when account domain is Outlook", async () => {
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "person@outlook.com" },
    })

    expect(
      await screen.findByText(/oauth2 sign-in below is usually more reliable than imap passwords/i)
    ).toBeInTheDocument()

    expect(screen.getByRole("button", { name: /use microsoft oauth2 below/i })).toBeDisabled()
  })

  it("blocks IMAP submit for Outlook addresses when Microsoft OAuth is configured", async () => {
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "person@outlook.com" },
    })
    fireEvent.change(screen.getByLabelText(/password \/ app password/i), {
      target: { value: "bad-password" },
    })

    const submitButton = await screen.findByRole("button", { name: /use microsoft oauth2 below/i })
    expect(submitButton).toBeDisabled()
    fireEvent.click(submitButton)

    expect(mockSignIn).not.toHaveBeenCalledWith("credentials", expect.anything())
  })

  it("shows Microsoft OAuth setup hint when provider is not configured", async () => {
    mockGetProviders.mockResolvedValue({
      google: { id: "google", name: "Google" },
    })
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "person@outlook.com" },
    })

    expect(
      await screen.findByText(/microsoft oauth2 isn't configured yet/i)
    ).toBeInTheDocument()
  })
})
