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
})
