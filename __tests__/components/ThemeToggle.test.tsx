import { fireEvent, render, screen } from "@testing-library/react"
import ThemeToggle from "@/components/ThemeToggle"

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.classList.add("dark")
    window.localStorage.clear()
  })

  it("toggles theme and stores preference", () => {
    render(<ThemeToggle />)

    expect(document.documentElement.classList.contains("dark")).toBe(true)
    fireEvent.click(screen.getByRole("button"))
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    expect(window.localStorage.getItem("theme")).toBe("light")
  })
})
