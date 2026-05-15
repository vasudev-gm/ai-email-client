export const THEME_STORAGE_KEY = "theme"

export function getPreferredThemeFromBrowser(win: Window): "light" | "dark" {
  const savedTheme = win.localStorage.getItem(THEME_STORAGE_KEY)
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme
  return win.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export const THEME_INIT_SCRIPT = `
  (() => {
    const savedTheme = localStorage.getItem("${THEME_STORAGE_KEY}");
    const preferredTheme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.classList.toggle("dark", preferredTheme === "dark");
  })();
`
