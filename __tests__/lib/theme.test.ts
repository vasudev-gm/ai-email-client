import { applyThemeFromBrowser, DEFAULT_THEME, getPreferredThemeFromBrowser } from "@/lib/theme"

describe("theme utilities", () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove("dark")
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: originalMatchMedia,
    })
  })

  it("uses device preference when no saved theme exists", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({ matches: true })),
    })

    expect(getPreferredThemeFromBrowser(window)).toBe("dark")
  })

  it("applies dark mode from device settings", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({ matches: true })),
    })
    window.localStorage.removeItem("theme")
    applyThemeFromBrowser(document, window)

    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("respects saved theme over device preference", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({ matches: true })),
    })
    window.localStorage.setItem("theme", DEFAULT_THEME)
    applyThemeFromBrowser(document, window)

    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })
})
