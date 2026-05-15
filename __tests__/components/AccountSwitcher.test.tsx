import { fireEvent, render, screen } from "@testing-library/react"
import AccountSwitcher from "@/components/AccountSwitcher"

describe("AccountSwitcher", () => {
  it("can add a new account", () => {
    render(<AccountSwitcher />)

    fireEvent.click(screen.getByRole("button", { name: /me@example.com/i }))
    fireEvent.click(screen.getByRole("button", { name: /add account/i }))
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: "new@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }))

    expect(screen.getByText("new@example.com")).toBeInTheDocument()
  })
})
