"use client"

import { useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/theme"

function getCurrentTheme() {
  if (typeof document === "undefined") return DEFAULT_THEME
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {}
      const handleThemeChange = () => onStoreChange()
      window.addEventListener("themechange", handleThemeChange)
      return () => window.removeEventListener("themechange", handleThemeChange)
    },
    getCurrentTheme,
    () => DEFAULT_THEME
  )

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark"
    document.documentElement.classList.toggle("dark", nextTheme === "dark")
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    window.dispatchEvent(new Event("themechange"))
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
