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
})
