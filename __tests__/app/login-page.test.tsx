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
    expect(screen.getByLabelText(/imap host/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^port$/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/imap host/i)).toBeInTheDocument()
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
  })
})
