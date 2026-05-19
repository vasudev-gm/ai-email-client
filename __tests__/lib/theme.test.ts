import { DEFAULT_THEME, getPreferredThemeFromBrowser, THEME_INIT_SCRIPT } from "@/lib/theme"

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

  it("theme init script applies dark mode from device settings", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({ matches: true })),
    })
    window.localStorage.removeItem("theme")

    new Function(THEME_INIT_SCRIPT)()

    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("theme init script respects saved theme over device preference", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({ matches: true })),
    })
    window.localStorage.setItem("theme", DEFAULT_THEME)

    new Function(THEME_INIT_SCRIPT)()

    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })
})
