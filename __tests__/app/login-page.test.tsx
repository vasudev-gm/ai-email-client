import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import LoginPage from "@/app/(auth)/login/page"

const mockSignIn = jest.fn()

jest.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}))

describe("LoginPage", () => {
  beforeEach(() => {
    mockSignIn.mockReset()
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

  it("prefers IMAP/SMTP by default and keeps OAuth2 options collapsed", () => {
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

    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /continue with microsoft/i })).toBeInTheDocument()
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
})
